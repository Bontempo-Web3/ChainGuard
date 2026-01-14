import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ScanRequest {
  repository: string
  commit: string
  branch?: string
  projectName?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: ScanRequest = await request.json()
    const { repository, commit, branch, projectName } = body

    if (!repository || !commit) {
      return NextResponse.json(
        { error: 'Repository and commit are required' },
        { status: 400 }
      )
    }

    const scannerUrl = process.env.NEXT_PUBLIC_SCANNER_URL || 'http://localhost:8000'

    console.log(`Starting scan for: ${projectName || repository}`)
    console.log(`Scanner URL: ${scannerUrl}`)
    console.log(`Repository: ${repository}, Commit: ${commit}`)

    const response = await fetch(`${scannerUrl}/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repository,
        commit,
        branch: branch || 'main',
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

    console.log(`Scan completed for: ${projectName || repository}`)
    console.log(`Vulnerabilities found: ${result.vulnerabilities?.length || 0}`)
    console.log(`Business rules: ${result.business_rules?.rules?.length || 0} rules`)
    console.log('Business rules data:', JSON.stringify(result.business_rules, null, 2))

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
