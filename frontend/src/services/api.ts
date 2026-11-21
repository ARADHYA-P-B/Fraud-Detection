import type{FraudCase,CaseActionPayload,TelemetryEventPayload} from "../types/fraud"

const CASE_API_URL = import.meta.env.VITE_CASE_API_URL || "http://localhost:8001/api/v1";
const INGEST_API_URL = import.meta.env.VITE_INGEST_API_URL || "http://localhost:8000/api/v1";

export const fraudApi = {
  async getCases(minRiskScore = 0): Promise<FraudCase[]> {
    const response = await fetch(`${CASE_API_URL}/cases?min_risk_score=${minRiskScore}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to fetch fraud cases: ${response.statusText}`);
    }
    return Array.isArray(data) ? data : data.cases || [];
  },

  async submitCaseAction(userId: string, payload: CaseActionPayload): Promise<void> {
    const response = await fetch(`${CASE_API_URL}/cases/${userId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to submit action: ${response.statusText}`);
    }
  },

  async simulateTelemetryEvent(event: TelemetryEventPayload): Promise<void> {
    const response = await fetch(`${INGEST_API_URL}/events/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!response.ok) {
      throw new Error(`Failed to ingest telemetry: ${response.statusText}`);
    }
  }
};