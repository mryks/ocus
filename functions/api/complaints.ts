import { handleComplaints, type ReportingEnv } from '../../server/complaints'
import { catalogSchema } from '../../src/domain/content'
import catalog from '../../src/content/catalog.json'

export function onRequest(context: { request: Request; env: ReportingEnv }) {
  return handleComplaints(context.request, context.env, catalogSchema.parse(catalog), context.request.headers.get('CF-Connecting-IP') ?? 'unknown')
}
