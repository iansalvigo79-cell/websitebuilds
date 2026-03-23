declare module 'country-telephone-data' {
  export const allCountries: Array<{
    name: string;
    iso2: string;
    dialCode: string;
    priority?: number;
    areaCodes?: string[];
  }>;
}
