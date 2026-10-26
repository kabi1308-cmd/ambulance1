import React from "react";
import { Check, Radio, CheckCircle2 } from "lucide-react";

export default function DispatchTimeline({ status = "STANDBY", allocation = null }) {
  const steps = [
    {
      id: "signal",
      label: "Signal Received",
      detail: "Emergency call registered",
      done: true,
      active: false,
    },
    {
      id: "triage",
      label: "Clinical Triage",
      detail: allocation ? `Severity L${allocation.triage?.severity || 3} scored` : "Evaluated",
      done: true,
      active: false,
    },
    {
      id: "allocated",
      label: "Facility Allocated",
      detail: allocation ? (allocation.allocated_hospital?.name?.split(" ")[0] || "Hospital") : "Pending",
      done: Boolean(allocation),
      active: false,
    },
    {
      id: "dispatched",
      label: "Unit Dispatched",
      detail: "AMB-07 mobilized",
      done: Boolean(allocation),
      active: status === "STANDBY" && Boolean(allocation),
    },
    {
      id: "enroute",
      label: "En Route to ER",
      detail: status === "ARRIVED" ? "Transit complete" : "Navigating road route",
      done: status === "ARRIVED",
      active: status === "EN ROUTE",
    },
    {
      id: "arrived",
      label: "Patient Handover",
      detail: "Arrived at Emergency Dept",
      done: status === "ARRIVED",
      active: status === "ARRIVED",
    },
  ];

  return (
    <div className="timeline-card card-panel">
      <div className="section-label">
        <Radio size={14} className="text-emerald" />
        <span>MISSION DISPATCH TIMELINE</span>
      </div>

      <div className="timeline-steps">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={`timeline-step ${step.done ? "completed" : ""} ${
              step.active ? "in-progress" : ""
            }`}
          >
            <div className="step-node" aria-hidden="true">
              {step.done ? (
                <Check size={12} />
              ) : step.active ? (
                <span className="node-pulse" />
              ) : (
                <span className="node-empty" />
              )}
            </div>
            <div className="step-content">
              <span className="step-name">{step.label}</span>
              <small className="step-detail">{step.detail}</small>
            </div>
            {idx < steps.length - 1 && <div className="step-line" aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  );
}
