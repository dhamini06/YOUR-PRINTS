export type TargetType = 'EMAIL' | 'DOMAIN' | 'USERNAME';

export type InvestigationStatus =
  | 'QUEUED'
  | 'VALIDATING'
  | 'DISCOVERING'
  | 'CORRELATING'
  | 'ANALYSING_EXPOSURE'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED';

export type EntityType =
  | 'EMAIL_TARGET'
  | 'USERNAME'
  | 'PUBLIC_ACCOUNT'
  | 'DOMAIN'
  | 'ORGANIZATION'
  | 'EXPOSURE_EVENT'
  | 'WEB_REFERENCE';

export type RelationshipType =
  | 'PROVIDED_BY'
  | 'HOSTED_ON'
  | 'POSSIBLE_ACCOUNT'
  | 'ASSOCIATED_WITH'
  | 'REPORTED_IN'
  | 'REFERENCES';

export type ObservationConfidence = 'DEFINITIVE' | 'RELIABLE' | 'UNCONFIRMED';

export type RelationshipConfidence =
  | 'CONFIRMED_ASSOCIATION'
  | 'STRONG_MATCH'
  | 'POSSIBLE_MATCH'
  | 'WEAK_SIGNAL'
  | 'UNVERIFIED';

export interface Entity {
  id: string;
  canonical_value: string;
  entity_type: EntityType;
  display_label: string;
  attributes: Record<string, any>;
  first_seen_at: string;
}

export interface Relationship {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: RelationshipType;
  confidence: RelationshipConfidence;
  evidence_id?: string;
  inference_rationale: string;
}

export interface Evidence {
  id: string;
  raw_signal_id?: string;
  source_label: string;
  source_url?: string;
  discovery_method: string;
  observation_confidence: ObservationConfidence;
  observed_value: string;
  rationale: string;
  observed_at: string;
}

export interface Investigation {
  id: string;
  target_value: string;
  target_type: TargetType;
  status: InvestigationStatus;
  current_stage: string;
  provider_states: Record<string, string>;
  summary_stats: {
    total_entities?: number;
    confirmed_links?: number;
    strong_matches?: number;
    possible_matches?: number;
    exposure_count?: number;
  };
  created_at: string;
  completed_at?: string;
  entities: Entity[];
  relationships: Relationship[];
}

export interface HealthCheckResponse {
  status: string;
  version: string;
  timestamp: string;
}
