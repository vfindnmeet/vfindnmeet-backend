import { float } from "aws-sdk/clients/lightsail";
import LocationRepository from "../repositories/LocationRepository";

export default class LocationService {
  constructor(
    private locationRepository: LocationRepository
  ) { }

  async getCitiesForCountry(countryId: string) {
    const [cities, country] = await Promise.all([
      this.locationRepository.findCitiesByCountryId(countryId),
      this.locationRepository.findCountryById(countryId)
    ]);

    return cities.map((city: any) => {
      city.name = `${city.name}, ${country.name}`;

      return city;
    });
  }

  async getCitiesById(cityIds: string[], withCountry = true) {
    if (!Array.isArray(cityIds) || 0 === cityIds.length) return [];

    const cities = await this.locationRepository.findCitiesById(cityIds);

    if (!withCountry) {
      return cities;
    }

    const countries = await this.locationRepository.findCountriesById(cities.map((city: any) => city.country_id));

    return cities.map((city: any) => {
      const country = countries.find((c: any) => c.id === city.country_id);
      city.name = `${city.name}, ${country.name}`;

      return city;
    });
  }

  async getLocationById(cityId: string) {
    const city = await this.locationRepository.findCityById(cityId);
    if (!city) return null;

    const country = await this.locationRepository.findCountryById(city.country_id);

    city.fullName = `${city.name}, ${country.name}`;

    return city;
  }

  async search(text: string) {
    if (2 > text.length) return [];

    const cities = await this.locationRepository.search(text);
    const countries = await this.locationRepository.findCountriesById(cities.map((city: any) => city.country_id));

    return cities.map((city: any) => {
      const country = countries.find((country: any) => country.id === city.country_id);
      city.fullName = `${city.name}, ${country.name}`;

      return city;
    });
  }

  async setPosition(userId: string, location: { lat: float; lon: float; }) {
    return await this.locationRepository.updatePosition(userId, location);
  }
}
