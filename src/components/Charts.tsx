import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';

const data = [
  { month: 'Jan', output: 400, savings: 120 },
  { month: 'Feb', output: 450, savings: 135 },
  { month: 'Mar', output: 600, savings: 180 },
  { month: 'Apr', output: 800, savings: 240 },
  { month: 'May', output: 950, savings: 285 },
  { month: 'Jun', output: 1100, savings: 330 },
  { month: 'Jul', output: 1150, savings: 345 },
  { month: 'Aug', output: 1050, savings: 315 },
  { month: 'Sep', output: 850, savings: 255 },
  { month: 'Oct', output: 650, savings: 195 },
  { month: 'Nov', output: 450, savings: 135 },
  { month: 'Dec', output: 350, savings: 105 },
];

export function EnergyOutputChart() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Area type="monotone" dataKey="output" stroke="#f59e0b" fillOpacity={1} fill="url(#colorOutput)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SavingsChart() {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="savings" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HistoricalIrradianceChart({ data }: { data: { date: string, value: number }[] }) {
  return (
    <div className="h-[120px] w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            hide 
          />
          <YAxis 
            hide 
            domain={['dataMin - 0.5', 'dataMax + 0.5']}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '10px', padding: '4px 8px' }}
            labelStyle={{ display: 'none' }}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#f59e0b" 
            strokeWidth={2} 
            dot={false}
            activeDot={{ r: 4, fill: '#f59e0b' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
