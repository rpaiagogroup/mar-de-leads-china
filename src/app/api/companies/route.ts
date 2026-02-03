import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Helper to normalize strings for comparison/keys
const normalize = (str: string | null | undefined) => {
    if (!str) return ''
    return str.trim().toLowerCase()
}

// Helper to extract a domain from a URL (simple version)
const extractDomain = (url: string | null | undefined) => {
    if (!url) return ''
    try {
        const cleanUrl = url.startsWith('http') ? url : `https://${url}`
        const hostname = new URL(cleanUrl).hostname
        return hostname.replace(/^www\./, '')
    } catch (e) {
        return normalize(url) // Fallback: just return normalized string if not a valid URL
    }
}

export async function GET() {
    try {
        // 1. Fetch filtered people
        const people = await prisma.pessoas_apollo_b2b.findMany({
            where: {
                notes: 'linkedin_scrapping',
                phone: {
                    startsWith: '+55'
                }
            }
        })

        // 2. Group by Unique Company
        const companiesMap = new Map<string, {
            key: string // Used for ID/Status
            name: string
            domainInput: string
            contacts: typeof people
        }>()

        for (const person of people) {
            // Determine Company Key (Preference: company_id (often a URL) -> company_name)
            // We normalize to ensure 'Apple' same as 'apple'
            let key = ''

            // If company_id looks like a domain/url, use that as key foundation
            if (person.company_id && person.company_id.includes('.')) {
                key = extractDomain(person.company_id)
            } else {
                key = normalize(person.company_name)
            }

            if (!key) continue // Skip if really no identifier

            if (!companiesMap.has(key)) {
                companiesMap.set(key, {
                    key,
                    name: person.company_name || 'Empresa Desconhecida',
                    domainInput: person.company_id || '', // Often holds the domain in Apollo data
                    contacts: []
                })
            }

            const entry = companiesMap.get(key)!
            entry.contacts.push(person)
        }

        // 3. Assemble List and Sort
        const allCompanies = Array.from(companiesMap.values())
            .sort((a, b) => a.name.localeCompare(b.name))

        // Prepare keys for DB lookups
        const keys = allCompanies.map(c => c.key)
        // Also prepare names/domains for Enrichment lookup
        const potentialDomains = allCompanies.map(c => extractDomain(c.domainInput)).filter(Boolean)
        const potentialNames = allCompanies.map(c => normalize(c.name)).filter(Boolean)

        // 4. Fetch Enrichment Data
        // We try to match via primary_domain OR company_name
        // Prisma doesn't have a great "OR" across list inclusion for mixed fields easily in one go efficiently without raw query or separate queries.
        // Given 55 items, we can just fetch potential matches.
        const enrichedData = await prisma.empresas_enriquecidas.findMany({
            where: {
                OR: [
                    { primary_domain: { in: potentialDomains, mode: 'insensitive' } },
                    { company_name: { in: potentialNames, mode: 'insensitive' } }
                ]
            }
        })

        // 5. Fetch Status Data
        const statusData = await prisma.company_outreach_status.findMany({
            where: {
                company_key: { in: keys }
            }
        })

        // 6. Assemble Final Response
        const result = allCompanies.map((comp, i) => {
            // Find Enrichment (Try matching domain first, then name)
            const owner = 'VANESSA'
            const domainKey = extractDomain(comp.domainInput)
            const enrich = enrichedData.find(e => {
                // Match domain
                if (e.primary_domain && extractDomain(e.primary_domain) === domainKey) return true
                // Match name
                if (e.company_name && normalize(e.company_name) === normalize(comp.name)) return true
                return false
            })

            // Find Status
            const status = statusData.find(s => s.company_key === comp.key)

            return {
                key: comp.key,
                owner: owner,
                name: enrich?.company_name || comp.name,
                description: enrich?.description || 'Sem descrição disponível.',
                website: enrich?.website || enrich?.primary_domain || comp.domainInput || null,
                location: [enrich?.city, enrich?.state, enrich?.country].filter(Boolean).join(', ') || null,

                // Status
                contacted: status?.contacted || false,
                contacted_by: status?.contacted_by || null,
                contacted_at: status?.contacted_at || null,

                // Contacts (Filtered ones)
                contacts: comp.contacts.map(p => ({
                    id: p.contact_id,
                    name: p.lead_name || 'Sem nome',
                    title: p.job_title || 'Sem cargo',
                    seniority: p.seniority_level,
                    email: p.email || 'N/A',
                    phone: p.phone, // We know it's not 'Not available' due to filter
                    linkedin: p.linkedin_url
                }))
            }
        })

        return NextResponse.json(result)

    } catch (error) {
        console.error('Error fetching companies:', error)
        return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
    }
}
