import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatNumberInput(value) {
  if (!value) return "";
  const numericValue = value.replace(/[^0-9]/g, "");
  if (numericValue === "") return "";
  return Number(numericValue).toLocaleString('id-ID');
}

export function parseFormattedNumber(value) {
  if (!value) return "";
  return value.replace(/\./g, "");
}

export function formatDateTime(dateString) {
    if (!dateString) return { date: '-', time: '-' };
    const date = new Date(dateString);
    return {
        date: date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }),
        time: date.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        })
    };
}

export function getLocalDateString(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
