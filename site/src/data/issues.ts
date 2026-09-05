export type Issue = {
  number: string;
  year: number;
  date: string;
  pages: number;
  cover: string;
  file: string;
  w: number;
  h: number;
};

export const issues: Issue[] = [
  { number: "1.1", year: 1981, date: "Nov-Dec 1981", pages: 40, cover: "/covers/cgw-1-1.jpg", file: "cgw_1.1.pdf", w: 458, h: 600 },
  { number: "2.1", year: 1982, date: "Jan-Feb 1982", pages: 40, cover: "/covers/cgw-2-1.jpg", file: "cgw_2.1.pdf", w: 452, h: 600 },
  { number: "3.4", year: 1983, date: "Jul-Aug 1983", pages: 56, cover: "/covers/cgw-3-4.jpg", file: "cgw_3.4.pdf", w: 452, h: 600 },
  { number: "5.5", year: 1985, date: "Nov-Dec 1985", pages: 66, cover: "/covers/cgw-5-5.jpg", file: "cgw_5.5.pdf", w: 451, h: 600 },
  { number: "25", year: 1986, date: "Jan-Feb 1986", pages: 50, cover: "/covers/cgw-25.jpg", file: "cgw_25.pdf", w: 451, h: 600 },
  { number: "39", year: 1987, date: "Aug-Sep 1987", pages: 58, cover: "/covers/cgw-39.jpg", file: "cgw_39.pdf", w: 451, h: 600 },
  { number: "48", year: 1988, date: "Jun 1988", pages: 58, cover: "/covers/cgw-48.jpg", file: "cgw_48.pdf", w: 451, h: 600 },
  { number: "62", year: 1989, date: "Aug 1989", pages: 50, cover: "/covers/cgw-62.jpg", file: "cgw_62.pdf", w: 455, h: 600 },
  { number: "75", year: 1990, date: "Oct 1990", pages: 82, cover: "/covers/cgw-75.jpg", file: "cgw_75.pdf", w: 455, h: 600 },
  { number: "100", year: 1992, date: "Nov 1992", pages: 196, cover: "/covers/cgw-100.jpg", file: "cgw_100.pdf", w: 451, h: 600 },
  { number: "112", year: 1993, date: "Nov 1993", pages: 228, cover: "/covers/cgw-112.jpg", file: "cgw_112.pdf", w: 453, h: 600 },
  { number: "128", year: 1995, date: "Mar 1995", pages: 204, cover: "/covers/cgw-128.jpg", file: "cgw_128.pdf", w: 434, h: 600 },
  { number: "141", year: 1996, date: "Apr 1996", pages: 230, cover: "/covers/cgw-141.jpg", file: "cgw_141.pdf", w: 424, h: 600 },
  { number: "150", year: 1997, date: "Jan 1997", pages: 362, cover: "/covers/cgw-150.jpg", file: "cgw_150.pdf", w: 424, h: 600 },
  { number: "162", year: 1998, date: "Jan 1998", pages: 380, cover: "/covers/cgw-162.jpg", file: "cgw_162.pdf", w: 424, h: 600 },
  { number: "175", year: 1999, date: "Feb 1999", pages: 280, cover: "/covers/cgw-175.jpg", file: "cgw_175.pdf", w: 424, h: 600 },
  { number: "186", year: 2000, date: "Jan 2000", pages: 222, cover: "/covers/cgw-186.jpg", file: "cgw_186.pdf", w: 424, h: 600 },
  { number: "198", year: 2001, date: "Jan 2001", pages: 198, cover: "/covers/cgw-198.jpg", file: "cgw_198.pdf", w: 433, h: 600 },
  { number: "210", year: 2002, date: "Jan 2002", pages: 156, cover: "/covers/cgw-210.jpg", file: "cgw_210.pdf", w: 424, h: 600 },
  { number: "223", year: 2003, date: "Feb 2003", pages: 134, cover: "/covers/cgw-223.jpg", file: "cgw_223.pdf", w: 424, h: 600 },
  { number: "235", year: 2004, date: "Feb 2004", pages: 128, cover: "/covers/cgw-235.jpg", file: "cgw_235.pdf", w: 424, h: 600 },
  { number: "247", year: 2005, date: "Jan 2005", pages: 134, cover: "/covers/cgw-247.jpg", file: "cgw_247.pdf", w: 424, h: 600 },
  { number: "258", year: 2006, date: "Jan 2006", pages: 124, cover: "/covers/cgw-258.jpg", file: "cgw_258.pdf", w: 434, h: 600 },
  { number: "268", year: 2006, date: "Nov 2006", pages: 136, cover: "/covers/cgw-268.jpg", file: "cgw_268.pdf", w: 424, h: 600 },
];

export const byNumber = (n: string) => issues.find((i) => i.number === n)!;
