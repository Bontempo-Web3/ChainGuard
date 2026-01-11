import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ScanRequest {
  projectPath: string
  projectName?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ScanRequest = await request.json()
    const { projectPath, projectName } = body

    if (!projectPath) {
      return NextResponse.json(
        { error: 'Project path is required' },
        { status: 400 }
      )
    }

    const scannerUrl = process.env.NEXT_PUBLIC_SCANNER_URL || 'http://localhost:8000'

    console.log(`Starting scan for: ${projectName || projectPath}`)
    console.log(`Scanner URL: ${scannerUrl}`)

    const response = await fetch(`${scannerUrl}/scan-directory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        directory: projectPath,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Scanner error:', errorText)
      return NextResponse.json(
        { error: `Scanner failed: ${errorText}` },
        { status: response.status }
      )
    }

    const result = await response.json()

    console.log(`Scan completed for: ${projectName || projectPath}`)
    console.log(`Vulnerabilities found: ${result.vulnerabilities?.length || 0}`)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Scan API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'ChainGuard Scan API',
    endpoints: {
      'POST /api/scan': 'Scan a project directory',
    },
  })
}
