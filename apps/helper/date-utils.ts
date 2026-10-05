import moment from "moment";

export const generateDate = () => {
    const currentDate = new Date();
    return currentDate;
}

export const getDate = (addDays: number = 0) => {
    const today = moment();
    let testdate = today.clone();
    testdate.add(addDays, 'days');
    return testdate.format('YYYY-MM-DD');
}

export const isBeforeCurrentDay = (inputDate) => {
    const today = moment();
    const testday = moment(formartDate(inputDate), 'YYYY-MM-DD').startOf('day');
    return testday.isBefore(today, 'day');
}

export const getFormattedDate = async (dateToFormart: string, dateFormat: string = 'DD/MM/YYYY'): Promise<string> => {
    return moment(dateToFormart).format(dateFormat);
  }


export const formartDate = (inputDate) => {
    inputDate = inputDate.replace(/[A-Za-z]/g, '').trim();
    const output = moment(inputDate, ["YYYY/MM/DD", "YYYY-MM-DD", "DD/MM/YYYY"], true).format("DD/MM/YYYY"); // => "21/11/2025"   
    const m = moment(output, 'DD/MM/YYYY', true);
    if (!m.isValid()) throw new Error('Invalid date: ' + output);
    return m.format('YYYY-MM-DD');
}

export const generateFutureDate = (futureDateBy: number) => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + futureDateBy);
    return currentDate;
}

/**
 * Convert the date string into Date object fo
 * @param date - The date string that ought to be coverted to a date object
 * @param separator  - The separator of the an output date string. E.g. "-" or "/"
 * @returns - Foramtted date string in a format "YYYY-MM-DD" or "YYYY/MM/DD"
 */
export const convertDateString = (date: string | null, separator: string): Date | null => {
    if (date != null) {
        const [day, month, year] = date.split(separator);
        const dateObject = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        return dateObject;
    } else {
        return null;
    }
};

/**
 * Formats a date string object into a string with a specified sepator
 * @param date - The date object to be formated
 * @param separator  - The separator of the an output date string. E.g. "-" or "/"
 * @returns - Foramtted date string in a format "YYYY-MM-DD" or "YYYY-MM-DD"
 */
export const formatDate = (date: Date | null, separator: string): string => {
    if (date) {
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        return [year, month, day].join(separator);
    } else {
        return ""
    }
};

export const formatDateFromDate = (date: Date | null, separator: string): string => {
    if (date) {
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
        return [day, month, year].join(separator);
    } else {
        return ""
    }
};

export const formatAmount = (amount: number | string): string => {
    const transformedAmount = typeof amount === 'string' ? Number(amount) : amount;
    return new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(transformedAmount);
};