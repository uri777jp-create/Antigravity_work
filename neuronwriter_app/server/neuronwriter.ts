import axios from "axios";

const API_KEY = process.env.X_API_KEY;
const BASE_URL = "https://app.neuronwriter.com/neuron-api/0.5/writer";

if (!process.env.NEURON_API_KEY) {
  console.warn("[NLP Data] X_API_KEY not found in environment variables");
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "X-API-KEY": API_KEY || "",
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

/**
 * List all projects available in the NeuronWriter account
 */
export async function listProjects() {
  const response = await apiClient.post("/list-projects");
  // API returns an array of projects directly
  return { projects: response.data };
}

/**
 * Create a new content generation query
 */
export async function createNewQuery(params: {
  project: string;
  keyword: string;
  language: string;
  engine: string;
}) {
  const response = await apiClient.post("/new-query", params);
  return response.data;
}

/**
 * Get content recommendations for a specific query
 * @param query - The query ID returned from /new-query
 */
export async function getQuery(query: string) {
  const response = await apiClient.post("/get-query", { query });
  return response.data;
}

/**
 * List queries in a project with optional filters
 */
export async function listQueries(params: {
  project: string;
  status?: "ready" | "pending" | "error";
  limit?: number;
  offset?: number;
}) {
  const response = await apiClient.post("/list-queries", params);
  return response.data;
}

/**
 * Import content for a query (creates new revision)
 * @param params.title - Optional title (overwrites title in HTML)
 * @param params.description - Optional meta description (overwrites description in HTML)
 * @param params.html - HTML content for the body (should NOT include title/description)
 */
export async function importContent(params: {
  project: string;
  query: string;
  html?: string;
  url?: string;
  title?: string;
  description?: string;
}) {
  const response = await apiClient.post("/import-content", params);
  return response.data;
}

/**
 * Get saved content revision for a query
 */
export async function getContent(params: {
  project: string;
  query: string;
  include_autosave?: boolean;
}) {
  const response = await apiClient.post("/get-content", params);
  return response.data;
}

/**
 * Evaluate content without saving
 * @param params.title - Optional title for evaluation
 * @param params.description - Optional meta description for evaluation
 */
export async function evaluateContent(params: {
  project: string;
  query: string;
  html?: string;
  url?: string;
  title?: string;
  description?: string;
}) {
  const response = await apiClient.post("/evaluate-content", params);
  return response.data;
}
