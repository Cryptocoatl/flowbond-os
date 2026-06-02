import { NextResponse } from 'next/server'
import { getData } from '@/lib/storage'

export async function GET() {
  const data = await getData()
  return NextResponse.json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    },
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  })
}
