import moment from "moment";

export class DateUtilities {

  static getNextWeekday() {
    const today = moment();
    let nextWeekday = today.clone();

    do {
      nextWeekday.add(1, 'days');
    } while (nextWeekday.day() === 0 || nextWeekday.day() === 6);

    return [
      nextWeekday.format('dddd, MMMM D, YYYY'),
      nextWeekday.format('MMM'),
      nextWeekday.format('D')
    ];
  }

  static async getDate(addDays: number = 0,dateFormat: string = 'DD/MM/YYYY'): Promise<string> {
    const today = moment();
    let testdate = today.clone();
    testdate.add(addDays, 'days');
    return testdate.format(dateFormat);
  }

  static async getFormattedDate(dateToFormart: string,dateFormat: string = 'DD/MM/YYYY'): Promise<string> {
    return moment(dateToFormart).format(dateFormat);
  }

  static async getFormattedDateConversion(dateToFormart: string,currentFormat: string,dateFormat: string = 'DD/MM/YYYY'): Promise<string> {
    return moment(dateToFormart, currentFormat).format(dateFormat);
  }
}