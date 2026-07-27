export type Schedule = {
  start: Date;
  end: Date;
  region: "APAC" | "EU" | "US";
}[];

export const schedule: Schedule = [
  {
    start: new Date("2023-10-31T19:00:00.000Z"),
    end: new Date("2023-11-01T03:00:00.000Z"),
    region: "US",
  },
  {
    start: new Date("2023-11-01T13:00:00.000Z"),
    end: new Date("2023-11-01T21:00:00.000Z"),
    region: "EU",
  },
  {
    start: new Date("2023-11-03T06:00:00.000Z"),
    end: new Date("2023-11-03T14:00:00.000Z"),
    region: "APAC",
  },
  {
    start: new Date("2023-11-04T13:00:00.000Z"),
    end: new Date("2023-11-04T21:00:00.000Z"),
    region: "EU",
  },
  {
    start: new Date("2023-11-06T07:00:00.000Z"),
    end: new Date("2023-11-06T15:00:00.000Z"),
    region: "APAC",
  },
  {
    start: new Date("2023-11-06T20:00:00.000Z"),
    end: new Date("2023-11-07T04:00:00.000Z"),
    region: "US",
  },
  {
    start: new Date("2023-11-09T07:00:00.000Z"),
    end: new Date("2023-11-09T15:00:00.000Z"),
    region: "APAC",
  },
  {
    start: new Date("2023-11-09T20:00:00.000Z"),
    end: new Date("2023-11-10T04:00:00.000Z"),
    region: "US",
  },
  {
    start: new Date("2023-11-10T14:00:00.000Z"),
    end: new Date("2023-11-10T22:00:00.000Z"),
    region: "EU",
  },
];
