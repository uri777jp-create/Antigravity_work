# ⚠️ NeuronWriter API Usage Warning

## Monthly Limit
- **200 queries per month**
- Each call to `/new-query` endpoint consumes 1 query from your monthly quota

## Important Guidelines

### DO NOT:
- ❌ Create tests that call `/new-query` endpoint
- ❌ Run tests that create actual queries in NeuronWriter
- ❌ Test query creation functionality repeatedly

### Safe to Test:
- ✅ `/list-projects` - Does not consume quota
- ✅ `/get-query` - Does not consume quota (only retrieves existing queries)
- ✅ `/list-queries` - Does not consume quota
- ✅ Database operations - Local only, no API calls

## Development Best Practices

1. **Use Browser UI for Testing**: Test query creation manually through the web interface, not automated tests
2. **Mock API Responses**: For unit tests, use mock data instead of real API calls
3. **Monitor Usage**: Keep track of queries created to avoid hitting the monthly limit

## Current Test Files

### Safe Tests (Keep):
- `server/auth.logout.test.ts` - No API calls
- `server/neuronwriter.test.ts` - Only calls `/list-projects` and database
- `server/neuronwriter.apikey.test.ts` - Only calls `/list-projects`

### Deleted Tests (Consumed Quota):
- ~~`server/create-query.test.ts`~~ - Created actual queries ❌
- ~~`server/get-query.test.ts`~~ - Called real API ❌
- ~~`server/api-response.test.ts`~~ - Called real API ❌
- ~~`server/debug-api.test.ts`~~ - Called real API ❌

## Queries Created During Development
- 2025-12-15 02:23 - Test query
- 2025-12-15 02:21 - Test query
- 2025-12-15 02:19 - Test query (2x)

**Total consumed: 4 / 200 queries**

## For Future Development
Before creating any new test files, ask yourself:
> "Will this test call `/new-query` and consume my monthly quota?"

If yes, **DO NOT CREATE THE TEST**. Use the browser UI instead.
