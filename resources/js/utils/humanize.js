export function humanizeEnum(value = '', sep = '_') {
    if (!value) return '';
    return value
        .split(sep)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}
