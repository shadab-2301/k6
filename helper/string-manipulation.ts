export const hyPhenateString = (str: string) => {
    const lowercased = str.toLowerCase();
    return lowercased.replace(/[\s_]/g, "-");
}

export const camelCaseString = (str: string) => {
    return str
        .split(/[^a-zA-Z0-9]+/)
        .map((word, index) =>
            index === 0
                ? word.toLowerCase()
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('');
}

export const pascalCaseString = (str: string) => {
    return str
        .split(/[^a-zA-Z0-9]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize the first letter of each word
        .join('');
}

export const formatAmount = (amount: number | string): string => {
    const transformedAmount = typeof amount === 'string' ? Number(amount) : amount;
    return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(transformedAmount);
};
