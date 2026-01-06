# NeuronWriter API Notes

## Base URL
```
https://app.neuronwriter.com/neuron-api/0.5/writer
```

## Authentication
- Header: `X-API-KEY: {your-api-key}`
- All requests use POST method

## /new-query Endpoint

### Parameters:
- `project`: Project ID (e.g., "e95fdd229fd98c10")
- `keyword`: Keyword to generate query for (e.g., "trail running shoes")
- `engine`: Search engine (e.g., "google.co.uk", "google.co.jp")
- `language`: Content language (e.g., "English", "Japanese")

### Response:
```json
{
  "query": "32dee2a89374a722",
  "query_url": "https://app.neuronwriter.com/analysis/view/32dee2a89374a722",
  "share_url": "https://app.neuronwriter.com/analysis/share/...",
  "readonly_url": "https://app.neuronwriter.com/analysis/content-preview/..."
}
```

## /get-query Endpoint

### Parameters:
- `query`: Query ID

### Response includes:
- `status`: "ready", "waiting", "in progress", "not found"
- `metrics`: Word count, readability recommendations
- `terms`: Content term suggestions
- `ideas`: Related questions
- `competitors`: SERP competitors

## Important Notes:
- After creating query with /new-query, it takes ~60 seconds to prepare recommendations
- Use /get-query to check if analysis is complete (status=='ready')
