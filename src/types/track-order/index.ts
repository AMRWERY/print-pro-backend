import type { StepStatus } from "~/types/order";

export type Validatable = { validate: () => Promise<{ valid: boolean }> };

export interface TrackStage {
  n: number;
  key: string;
  title: string;
  body: string;
  /** Planned completion time. */
  at: Date;
  status: StepStatus;
}

export type TrackState = "processing" | "in-transit" | "ready" | "delivered";

export interface TrackEvent {
  at: Date;
  title: string;
  body: string;
}
