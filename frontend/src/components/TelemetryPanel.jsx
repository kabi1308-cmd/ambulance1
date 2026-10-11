import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function TelemetryPanel({ hospitals }) {
  const chartData = hospitals.map((hospital) => ({
    name: hospital.name.split(" ")[0],
    available: hospital.available_beds,
    oneHour: Number(hospital.forecast?.projected_1h ?? hospital.available_beds),
    threeHour: Number(hospital.forecast?.projected_3h ?? hospital.available_beds),
    sixHour: Number(hospital.forecast?.projected_6h ?? hospital.available_beds),
  }));

  return (
    <div className="telemetry-panel">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">AI FORECAST / UTILIZATION</p>
          <h2>Bed Utilization Intelligence</h2>
        </div>
      </div>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barGap={8}>
            <CartesianGrid stroke="#1f3550" strokeDasharray="3 3" />
            <XAxis dataKey="name" stroke="#8aa7b6" tickLine={false} axisLine={false} />
            <YAxis stroke="#8aa7b6" tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "#071c2b",
                border: "1px solid #19425c",
                color: "#dff5ff",
              }}
            />
            <Bar dataKey="available" fill="#34d399" radius={[4, 4, 0, 0]} />
            <Bar dataKey="oneHour" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            <Bar dataKey="threeHour" fill="#fbbf24" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
