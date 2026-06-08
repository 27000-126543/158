import dayjs from 'dayjs';
import { DATE_FORMAT, DATETIME_FORMAT, MONTH_FORMAT, CURRENCIES } from './constants';

export const formatCurrency = (amount: number, currency: string = 'CNY', decimals: number = 2): string => {
  const currencyInfo = CURRENCIES.find(c => c.value === currency);
  const symbol = currencyInfo?.symbol || '¥';
  
  const formatted = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  
  return `${symbol}${formatted}`;
};

export const formatNumber = (num: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

export const formatPercent = (value: number, decimals: number = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatDate = (date: Date | string | number, format: string = DATE_FORMAT): string => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

export const formatDateTime = (date: Date | string | number, format: string = DATETIME_FORMAT): string => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

export const formatMonth = (date: Date | string | number, format: string = MONTH_FORMAT): string => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

export const formatRelativeTime = (date: Date | string | number): string => {
  if (!date) return '-';
  const now = dayjs();
  const target = dayjs(date);
  const diffDays = now.diff(target, 'day');
  
  if (diffDays === 0) {
    const diffHours = now.diff(target, 'hour');
    if (diffHours === 0) {
      const diffMinutes = now.diff(target, 'minute');
      if (diffMinutes === 0) {
        return '刚刚';
      }
      return `${diffMinutes}分钟前`;
    }
    return `${diffHours}小时前`;
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}周前`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}个月前`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years}年前`;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatPhone = (phone: string): string => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3');
  }
  return phone;
};

export const formatIdCard = (idCard: string): string => {
  if (!idCard) return '-';
  if (idCard.length >= 15) {
    return idCard.replace(/(\d{6})\d+(\d{4})/, '$1********$2');
  }
  return idCard;
};

export const formatBankCard = (cardNo: string): string => {
  if (!cardNo) return '-';
  const cleaned = cardNo.replace(/\D/g, '');
  if (cleaned.length >= 16) {
    return cleaned.replace(/(\d{4})\d+(\d{4})/, '$1 **** **** $2');
  }
  return cardNo;
};

export const parseCurrency = (value: string): number => {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
};

export const getStatusLabel = <T extends string>(
  value: T,
  options: { value: T; label: string }[]
): string => {
  const option = options.find(o => o.value === value);
  return option?.label || value;
};

export const getStatusColor = <T extends string>(
  value: T,
  options: { value: T; color: string }[]
): string => {
  const option = options.find(o => o.value === value);
  return option?.color || 'default';
};
