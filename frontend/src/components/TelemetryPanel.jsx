import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, BarChart3, AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function TelemetryPanel({ hospitals = [] }) {
  const safeHospitals = Array.isArray(hospitals) ? hospitals : [];
  if (safeHospitals.length === 0) {
    return (
      <div className="telemetry-panel card-panel">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">AI FORECAST // TELEMETRY</p>
            <h2>Bed Utilization Intelligence</h2>
          </div>
        </div>
        <div className="empty-chart-note">
          <AlertCircle size={18} className="text-amber" />
          <span>No facility telemetry available for projection charting.</span>
        </div>
      </div>
    );
  }

  const chartData = safeHospitals.map((hospital) => ({
    name: (hospital?.name || "Facility").replace("Hospital", "Hosp").replace("Institute", "Inst").replace("Center", "Ctr"),
    available: hospital?.available_beds || 0,
    oneHour: Number(hospital?.forecast?.projected_1h ?? hospital?.available_beds ?? 0),
    threeHour: Number(hospital?.forecast?.projected_3h ?? hospital?.available_beds ?? 0),
    sixHour: Number(hospital?.forecast?.projected_6h ?? hospital?.available_beds ?? 0),
  }));

  // Identify lowest and highest capacity facilities from real data
  const sorted = [...safeHospitals].sort((a, b) => (a?.available_beds || 0) - (b?.available_beds || 0));
  const lowestHosp = sorted[0];
  const highestHosp = sorted[sorted.length - 1];

  // Calculate 6-hour regional projected net change
  const currentTotal = safeHospitals.reduce((sum, h) => sum + (h?.available_beds || 0), 0);
  const sixHourTotal = safeHospitals.reduce(
    (sum, h) => sum + Number(h?.forecast?.projected_6h ?? h?.available_beds ?? 0),
    0
  );
  const netDelta = sixHourTotal - currentTotal;

  return (
    <div className="telemetry-panel card-panel">
      {/* Panel Heading */}
      <div className="section-heading compact telemetry-header">
        <div>
          <p className="eyebrow">AI PROJECTION ENGINE // DETERMINISTIC LINEAR TELEMETRY</p>
          <h2>Regional Bed Utilization & Capacity Projections</h2>
        </div>
        <div className="telemetry-badges">
          <span className="telemetry-chip">
            <TrendingUp size={13} className="text-cyan" />
            6H OUTLOOK: {netDelta >= 0 ? `+${netDelta} BEDS (TURNOVER)` : `${netDelta} BEDS (STRAIN)`}
          </span>
        </div>
      </div>

      {/* Telemetry Quick Summary KPI Strip */}
      <div className="telemetry-kpis">
        <div className="kpi-box">
          <span className="kpi-label">CRITICAL BOTTLENECK FACILITY</span>
          <strong className="kpi-val text-amber">
            {lowestHosp ? `${lowestHosp.name.split(" ")[0]} (${lowestHosp.available_beds} beds)` : "--"}
          </strong>
          <small className="kpi-sub">Nearest to saturation threshold</small>
        </div>

        <div className="kpi-box">
          <span className="kpi-label">MAXIMUM BUFFER FACILITY</span>
          <strong className="kpi-val text-emerald">
            {highestHosp ? `${highestHosp.name.split(" ")[0]} (${highestHosp.available_beds} beds)` : "--"}
          </strong>
          <small className="kpi-sub">Primary destination for stable diversion</small>
        </div>

        <div className="kpi-box">
          <span className="kpi-label">FORECAST HORIZONS</span>
          <strong className="kpi-val text-cyan">1-HOUR / 3-HOUR / 6-HOUR</strong>
          <small className="kpi-sub">Admissions model + discharge turnover rate</small>
        </div>
      </div>

      {/* Recharts Multi-Series Bar Chart */}
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={290}>
          <BarChart data={chartData} barGap={5} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid stroke="#162e45" strokeDasharray="2 2" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#7593a8"
              tickLine={false}
              axisLine={{ stroke: "#1c3c58" }}
              tick={{ fontSize: 11, fontFamily: "DM Mono, monospace" }}
            />
            <YAxis
              stroke="#7593a8"
              tickLine={false}
              axisLine={{ stroke: "#1c3c58" }}
              tick={{ fontSize: 11, fontFamily: "DM Mono, monospace" }}
            />
            <Tooltip
              contentStyle={{
                background: "#081626",
                border: "1px solid #1e4566",
                borderRadius: "4px",
                color: "#e2f2fc",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.7)",
                fontSize: "12px",
                fontFamily: "DM Mono, monospace",
                lineHeight: "1.6",
              }}
              itemStyle={{ padding: "2px 0" }}
              cursor={{ fill: "rgba(34, 211, 238, 0.05)" }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: "16px",
                fontSize: "11px",
                fontFamily: "DM Mono, monospace",
                color: "#94a3b8",
              }}
            />
            <Bar dataKey="available" name="Current Available" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Bar dataKey="oneHour" name="+1H Projected" fill="#06b6d4" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Bar dataKey="threeHour" name="+3H Projected" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={32} />
            <Bar dataKey="sixHour" name="+6H Projected" fill="#a78bfa" radius={[3, 3, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
