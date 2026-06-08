import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import { formatCurrency } from '../../utils/format';

interface RevenueTrendChartProps {
  data: { date: string; amount: number }[];
  height?: number;
}

export default function RevenueTrendChart({ data, height = 350 }: RevenueTrendChartProps) {
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
      formatter: (params: any) => {
        const date = dayjs(params[0].axisValue).format('YYYY-MM-DD');
        let result = `<div style="font-weight: 600; margin-bottom: 8px;">${date}</div>`;
        params.forEach((item: any) => {
          result += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${item.color};"></span>
            <span>${item.seriesName}:</span>
            <span style="font-weight: 600;">${formatCurrency(item.value)}</span>
          </div>`;
        });
        return result;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map(item => dayjs(item.date).format('MM-DD')),
      axisLine: {
        lineStyle: {
          color: '#E5E6EB',
        },
      },
      axisLabel: {
        color: '#86909C',
        fontSize: 11,
      },
      axisTick: {
        show: false,
      },
    },
    yAxis: {
      type: 'value',
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
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        lineStyle: {
          width: 3,
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#165DFF' },
              { offset: 1, color: '#4080FF' },
            ],
          },
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(22, 93, 255, 0.25)' },
              { offset: 1, color: 'rgba(22, 93, 255, 0.02)' },
            ],
          },
        },
        itemStyle: {
          color: '#165DFF',
          borderWidth: 2,
          borderColor: '#fff',
        },
        emphasis: {
          focus: 'series',
          itemStyle: {
            symbolSize: 8,
          },
        },
        data: data.map(item => item.amount),
        animationDuration: 2000,
        animationEasing: 'cubicOut',
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
