import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { company_key, contacted, contacted_by } = body

        if (!company_key) {
            return NextResponse.json({ error: 'Missing company_key' }, { status: 400 })
        }

        const result = await prisma.company_outreach_status.upsert({
            where: {
                company_key: company_key
            },
            update: {
                contacted: contacted,
                contacted_by: contacted ? contacted_by : null, // Clear user if unchecking? Or keep history? User said "registrar quem marcou". Defaults to keeping last one usually. Let's update it if marked true.
                contacted_at: contacted ? new Date() : null
            },
            create: {
                company_key,
                contacted,
                contacted_by,
                contacted_at: new Date()
            }
        })

        return NextResponse.json(result)

    } catch (error) {
        console.error('Error updating status:', error)
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }
}
