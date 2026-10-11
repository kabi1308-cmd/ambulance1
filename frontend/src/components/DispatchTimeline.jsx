import React from "react";
import { Check, Clock, Radio, Activity, Navigation, CheckCircle2 } from "lucide-react";

export default function DispatchTimeline({ status, allocation }) {
  const steps = [
    {
      id: "signal",
      label: "Emergency Signal Received",
      done: true,
      active: false,
    },
    {
      id: "triage",
      label: "Patient Triaged",
      done: true,
      active: false,
    },
    {
      id: "allocated",
      label: "Hospital Allocated",
      done: Boolean(allocation),
      active: false,
    },
    {
      id: "dispatched",
      label: "Ambulance Dispatched",
      done: Boolean(allocation),
      active: status === "STANDBY" && Boolean(allocation),
    },
    {
      id: "enroute",
      label: "En Route to Hospital",
      done: status === "ARRIVED",
      active: status === "EN ROUTE",
    },
    {
      id: "arrived",
      label: "Patient Arrived at ER",
      done: status === "ARRIVED",
      active: status === "ARRIVED",
    },
  ];

  return (
    <div className="timeline-card card-panel">
      <div className="section-label">
        <Radio size={14} className="text-emerald" />
        <span>DISPATCH ROUTE STATUS TIMELINE</span>
      </div>

      <div className="timeline-steps">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={`timeline-step ${step.done ? "completed" : ""} ${
              step.active ? "in-progress" : ""
            }`}
          >
            <div className="step-node">
              {step.done ? (
                <Check size={11} />
              ) : step.active ? (
                <span className="node-pulse" />
              ) : (
                <span className="node-empty" />
              )}
            </div>
            <div className="step-content">
              <span className="step-name">{step.label}</span>
            </div>
            {idx < steps.length - 1 && <div className="step-line" />}
          </div>
        ))}
      </div>
    </div>
  );
}
