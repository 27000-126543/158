import ReactECharts from 'echarts-for-react';
import { formatCurrency, formatPercent } from '../../utils/format';
import { BUSINESS_LINES, CATEGORIES } from '../../utils/constants';

interface BusinessLinePieChartProps {
  data: { businessLine: string; amount: number; percentage: number }[];
  height?: number;
}

const COLORS = ['#165DFF', '#00B42A', '#FF7D00', '#722ED1', '#F53F3F', '#00BFBC', '#FFC72E', '#F7BA1E'];

export default function BusinessLinePieChart({ data, height = 350 }: BusinessLinePieChartProps) {
  const chartData = data.map((item, index) => {
    const lineInfo = BUSINESS_LINES.find(l => l.value === item.businessLine);
    const categoryInfo = CATEGORIES.find(c => c.value === item.businessLine);
    return {
      value: item.amount,
      name: lineInfo?.label || categoryInfo?.label || item.businessLine,
      itemStyle: {
        color: COLORS[index % COLORS.length],
      },
    };
  });

  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E6EB',
      borderWidth: 1,
      textStyle: {
        color: '#1D2129',
        fontSize: 12,
      },
      formatter: (params: any) => {
        const percent = params.percent.toFixed(1);
        return `<div style="font-weight: 600; margin-bottom: 8px;">${params.name}</div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${params.color};"></span>
            <span>收入:</span>
            <span style="font-weight: 600;">${formatCurrency(params.value)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${params.color};"></span>
            <span>占比:</span>
            <span style="font-weight: 600;">${percent}%</span>
          </div>`;
      },
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 12,
      textStyle: {
        color: '#4E5969',
        fontSize: 12,
        padding: [0, 0, 0, 6],
      },
      formatter: (name: string) => {
        const item = chartData.find(d => d.name === name);
        if (item) {
          const percent = ((item.value / chartData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1);
          return `${name}  ${percent}%`;
        }
        return name;
      },
    },
    series: [
      {
        name: '业务线收入',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 600,
            color: '#1D2129',
            formatter: (params: any) => {
              return `${params.name}\n${formatCurrency(params.value)}`;
            },
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
          },
        },
        labelLine: {
          show: false,
        },
        data: chartData,
        animationType: 'scale',
        animationEasing: 'elasticOut',
        animationDuration: 1500,
        animationDelay: (idx: number) => idx * 100,
      },
    ],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
