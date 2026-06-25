declare module "world-map-country-shapes" {
  interface CountryShape {
    id: string;
    shape: string;
  }
  const shapes: CountryShape[];
  export default shapes;
}
