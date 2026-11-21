export type RiskTier = "CRITICAL" | "HIGH" | "LOW";

export type CaseStatus = 
  | "PENDING_REVIEW" 
  | "ESCALATED" 
  | "DISMISSED" 
  | "INVESTIGATING";

export type AnalystActionType = "ESCALATE" | "DISMISS" | "INVESTIGATE";

export interface FraudCase {
  user_id: string;
  risk_score: number;
  risk_tier: RiskTier;
  flagged_reason: string;
  status: CaseStatus;
  updated_at: string;
}

export interface CaseActionPayload {
  analyst_id: string;
  action: AnalystActionType;
  notes: string;
  lock_account: boolean;
}

export interface TelemetryEventPayload {
  event_id: string;
  user_id: string;
  session_id: string;
  timestamp: string;
  event_type: "LOGIN" | "LOAN_APPLICATION" | "PASSWORD_RESET" | "WIRE_TRANSFER";
  ip_address: string;
  device_id: string;
  is_vpn: boolean;
}