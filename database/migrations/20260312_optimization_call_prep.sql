-- Structured call preparation data (JSONB) for optimization surveys
-- Stores: achievements, difficulties_approach, proposal, proposal_reason, objections[], call_goal
ALTER TABLE optimization_surveys ADD COLUMN IF NOT EXISTS call_prep JSONB DEFAULT '{}';
