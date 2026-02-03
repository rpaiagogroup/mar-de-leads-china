import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        // Validation is loose to allow flexibility, but we expect these fields
        const { company, name, phone, email, linkedin } = body

        const webhookUrl = 'https://n8n-study.gogroupgl.com/webhook/mar-de-leads-hub'

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                company,
                name: name || 'Sem nome', // Fallback
                numero_telefone: phone || '', // Mapping to user request "numero telefone" (checking exact key needed provided in prompt? User listed fields: 'numero telefone')
                // User prompt: "> numero telefone"
                // I will match exact keys requested: "empresa", "nome pessoa", "numero telefone", "email", "linkedin", "fonte"
                // But JSON standard usually snake_case or camelCase. The user prompt used specific portuguese names. 
                // "empresa"
                // "nome pessoa"
                // "numero telefone"
                // "email"
                // "linkedin"
                // "fonte" (CHINA-RPA)

                empresa: company,
                "nome pessoa": name,
                "numero telefone": phone,
                email,
                linkedin,
                fonte: 'CHINA-RPA'
            }),
        })

        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.statusText}`)
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('HubSpot proxy error:', error)
        return NextResponse.json({ error: 'Failed to send to HubSpot' }, { status: 500 })
    }
}
