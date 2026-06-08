import ReactECharts from 'echarts-for-react';
import { formatCurrency, formatPercent } from '../../utils/format';
import { BUSINESS_LINES } from '../../utils/constants';

interface BusinessLineBarChartProps {
  data: { businessLine: string; amount: number; percentage: number }[];
  height?: number;
}

const COLORS = ['#165DFF', '#00B42A', '#FF7D00', '#722ED1', '#F53F3F'];

export default function BusinessLineBarChart({ data, height = 350 }: BusinessLineBarChartProps) {
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);
  const maxValue = Math.max(...sortedData.map(d => d.amount)) * 1.1;

  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E6EB',
      borderWidth: 1,
      textStyle: {
        color: '#1D2129',
        fontSize: 12,
      },
      axisPointer: {
        type: 'shadow',
        shadowStyle: {
          color: 'rgba(22, 93, 255, 0.05)',
        },
      },
      formatter: (params: any) => {
        const param = params[0];
        const dataItem = sortedData[param.dataIndex];
        return `<div style="font-weight: 600; margin-bottom: 8px;">${param.name}</div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${param.color};"></span>
            <span>收入:</span>
            <span style="font-weight: 600;">${formatCurrency(dataItem.amount)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${param.color};"></span>
            <span>占比:</span>
            <span style="font-weight: 600;">${formatPercent(dataItem.percentage)}</span>
          </div>`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '8%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: sortedData.map(item => {
        const lineInfo = BUSINESS_LINES.find(l => l.value === item.businessLine);
        return lineInfo?.label || item.businessLine;
      }),
      axisLine: {
        lineStyle: {
          color: '#E5E6EB',
        },
      },
      axisLabel: {
        color: '#4E5969',
        fontSize: 11,
        interval: 0,
        rotate: 0,
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
      max: maxValue,
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        color: '#86909C',
        fontSize: 11,
        formatter: (value: number) => {
          if (value >= 10000) {
            return `${(value / 10000).toFixed(0)}万`;
          }
          return value.toString();
        },
      },
      splitLine: {
        lineStyle: {
          color: '#F2F3F5',
          type: 'dashed',
        },
      },
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        barWidth: '45%',
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: (params: any) => {
            return {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: COLORS[params.dataIndex % COLORS.length] },
                { offset: 1, color: `${COLORS[params.dataIndex % COLORS.length]}80` },
              ],
            };
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.15)',
          },
        },
        label: {
          show: true,
          position: 'top',
          color: '#1D2129',
          fontSize: 11,
          fontWeight: 500,
          formatter: (params: any) => {
            const value = params.value;
            if (value >= 10000) {
              return `${(value / 10000).toFixed(1)}万`;
            }
            return value.toString();
          },
        },
        data: sortedData.map(item => item.amount),
        animationDuration: 1500,
        animationEasing: 'cubicOut',
        animationDelay: (idx: number) => idx * 150,
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
