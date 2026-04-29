import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Download,
  Factory,
  FileText,
  Loader2,
  LocateFixed,
  MapPin,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { AccountGate } from './components/AccountGate';
import { IndustrySelector } from './components/IndustrySelector';
import { ComparisonCard } from './components/ComparisonCard';
import { EmissionsChart } from './components/EmissionsChart';
import { FacilitiesComparison } from './components/FacilitiesComparison';
import { GeographicSpread } from './components/GeographicSpread';
import brandPhoto from '../assets/branding/logo-with-image.jpg';
import brandLogo from '../../Varberg-Hackathon/branding/Icons Of colorful.png';
import protectedAreasUrl from '../../Varberg-Hackathon/hackathon_data/halland_skyddade_omraden.geojson?url';

const eprtrRawFileUrls = import.meta.glob('../../Varberg-Hackathon/hackathon_data/eprtr_raw/*.csv', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>;

const accountStorageKey = 'industry-duel-user';
const maxMappedLocations = 10;
const categoryUnitLabel = 't/year';

interface CsvRow {
  [key: string]: string;
}

interface FacilityLocation {
  country: string;
  lat: number;
  lon: number;
}

interface FacilitySummary extends FacilityLocation {
  id: string;
  name: string;
  sectorName: string;
  city: string;
  sourceFile: string;
}

interface MetricData {
  valuesByYear: Map<number, number>;
  facilityIds: Set<string>;
  locationCandidates: Array<FacilityLocation & { amount: number; facilityId: string }>;
  countryValuesByYear: Map<string, Map<number, number>>;
  countryFacilityIds: Map<string, Set<string>>;
}

interface CategoryDataset {
  id: string;
  label: string;
  description: string;
  metricLabel: string;
  valueLabel: string;
  sourceFiles: string[];
  metrics: string[];
  sectors: Map<string, Map<string, MetricData>>;
}

interface EprtrDataset {
  industries: string[];
  categories: CategoryDataset[];
  categoriesById: Map<string, CategoryDataset>;
  allFacilities: FacilitySummary[];
}

interface NearbyFactory extends FacilitySummary {
  distanceKm: number;
}

interface ProtectedAreaHit {
  id: string;
  name: string;
  type: string;
  distanceKm: number;
}

interface NearbyResult {
  lat: number;
  lon: number;
  factories: NearbyFactory[];
  protectedAreas: ProtectedAreaHit[];
  protectedAreaNote: string;
}

type NearbyStatus = 'idle' | 'loading' | 'ready' | 'error';

interface CountryFootprint {
  country: string;
  amount: number;
  facilities: number;
}

interface CountryComparisonData {
  data: Array<{ year: number; industry1: number; industry2: number }>;
  country1Total: number;
  country2Total: number;
  country1Facilities: number;
  country2Facilities: number;
}

type GeoJsonPosition = [number, number];
type GeoJsonRing = GeoJsonPosition[];
type GeoJsonPolygon = GeoJsonRing[];
type GeoJsonGeometry =
  | { type: 'Point'; coordinates: GeoJsonPosition }
  | { type: 'MultiPoint'; coordinates: GeoJsonPosition[] }
  | { type: 'Polygon'; coordinates: GeoJsonPolygon }
  | { type: 'MultiPolygon'; coordinates: GeoJsonPolygon[] };

interface ProtectedAreaFeature {
  type: 'Feature';
  properties: {
    NVRID?: string;
    NAMN?: string;
    skyddstyp?: string;
  };
  geometry: GeoJsonGeometry | null;
}

interface ProtectedAreaFeatureCollection {
  type: 'FeatureCollection';
  features: ProtectedAreaFeature[];
}

function parseCsvRows(csvText: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      row.push(field);
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = '';
      continue;
    }

    field += char;
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headerRow, ...dataRows] = rows;
  if (!headerRow) {
    return [];
  }

  const headers = headerRow.map((header) => header.replace(/^\uFEFF/, ''));
  return dataRows.map((dataRow) =>
    headers.reduce<CsvRow>((record, header, index) => {
      record[header] = dataRow[index] ?? '';
      return record;
    }, {}),
  );
}

function numericValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function createMetricData(): MetricData {
  return {
    valuesByYear: new Map(),
    facilityIds: new Set(),
    locationCandidates: [],
    countryValuesByYear: new Map(),
    countryFacilityIds: new Map(),
  };
}

function createCategoryDataset(id: string, label: string, sourceFile: string, metricLabel: string): CategoryDataset {
  return {
    id,
    label,
    description: `${label} from ${sourceFile}`,
    metricLabel,
    valueLabel: `Reported ${label.toLowerCase()}`,
    sourceFiles: [sourceFile],
    metrics: [],
    sectors: new Map(),
  };
}

function getMetricData(category: CategoryDataset, sectorName: string, metricName: string) {
  let sectorMetrics = category.sectors.get(sectorName);
  if (!sectorMetrics) {
    sectorMetrics = new Map();
    category.sectors.set(sectorName, sectorMetrics);
  }

  let metricData = sectorMetrics.get(metricName);
  if (!metricData) {
    metricData = createMetricData();
    sectorMetrics.set(metricName, metricData);
  }

  return metricData;
}

function addMetricName(category: CategoryDataset, metricName: string) {
  if (metricName && !category.metrics.includes(metricName)) {
    category.metrics.push(metricName);
  }
}

function addAmountByYear(metricData: MetricData, reportingYear: string, rawAmount: string, convertKgToTonnes: boolean) {
  const parsedYear = numericValue(reportingYear);
  const parsedAmount = numericValue(rawAmount);
  if (parsedYear === null || parsedAmount === null) {
    return null;
  }

  const year = Math.trunc(parsedYear);
  const amount = convertKgToTonnes ? parsedAmount / 1000 : parsedAmount;
  const currentValue = metricData.valuesByYear.get(year) ?? 0;
  metricData.valuesByYear.set(year, currentValue + amount);
  return amount;
}

function addFacilityPoint(metricData: MetricData, row: CsvRow, amount: number) {
  const latitude = numericValue(row.Latitude);
  const longitude = numericValue(row.Longitude);
  if (latitude === null || longitude === null) {
    return;
  }

  const facilityId = row.FacilityInspireId || `${row.countryName}-${row.facilityName}-${row.city}`;
  metricData.facilityIds.add(facilityId);
  metricData.locationCandidates.push({
    country: row.countryName || 'Unknown country',
    lat: latitude,
    lon: longitude,
    amount,
    facilityId,
  });
}

function addCountryAmount(metricData: MetricData, row: CsvRow, amount: number) {
  const parsedYear = numericValue(row.reportingYear);
  const country = row.countryName || 'Unknown country';

  if (parsedYear === null) {
    return;
  }

  const year = Math.trunc(parsedYear);
  const countryValues = metricData.countryValuesByYear.get(country) ?? new Map<number, number>();
  countryValues.set(year, (countryValues.get(year) ?? 0) + amount);
  metricData.countryValuesByYear.set(country, countryValues);

  const facilityId = row.FacilityInspireId || `${row.countryName}-${row.facilityName}-${row.city}`;
  const facilityIds = metricData.countryFacilityIds.get(country) ?? new Set<string>();
  facilityIds.add(facilityId);
  metricData.countryFacilityIds.set(country, facilityIds);
}

function addFacilitySummary(facilities: Map<string, FacilitySummary>, row: CsvRow, sourceFile: string) {
  const latitude = numericValue(row.Latitude);
  const longitude = numericValue(row.Longitude);
  const sectorName = row.EPRTR_SectorName;

  if (latitude === null || longitude === null || !sectorName) {
    return;
  }

  const facilityId = row.FacilityInspireId || `${row.countryName}-${row.facilityName}-${row.city}-${latitude}-${longitude}`;
  const facilityKey = `${facilityId}-${latitude}-${longitude}`;

  if (facilities.has(facilityKey)) {
    return;
  }

  facilities.set(facilityKey, {
    id: facilityId,
    name: row.facilityName || 'Unnamed facility',
    sectorName,
    country: row.countryName || 'Unknown country',
    city: row.city || 'Unknown city',
    lat: latitude,
    lon: longitude,
    sourceFile,
  });
}

function addIndustryNames(industryNames: Set<string>, csvText: string) {
  parseCsvRows(csvText).forEach((row) => {
    if (row.EPRTR_SectorName) {
      industryNames.add(row.EPRTR_SectorName);
    }
  });
}

function filenameFromPath(path: string) {
  return path.split('/').pop() ?? path;
}

function humanizeIdentifier(identifier: string) {
  return identifier
    .replace(/\.csv$/i, '')
    .replace(/^F\d+_\d+_/, '')
    .replace(/_(Sector|Facilities)$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function categoryKeyFromFilename(filename: string) {
  return filename
    .replace(/\.csv$/i, '')
    .replace(/^F\d+_\d+_/, '')
    .replace(/_(Sector|Facilities)$/i, '');
}

function valueColumnFromHeaders(headers: string[]) {
  return headers.find((header) => ['Releases', 'transfers', 'wasteTransfers'].includes(header));
}

function metricNamesFromRow(row: CsvRow, headers: string[], valueColumn: string) {
  if (row.Pollutant) {
    return [row.Pollutant];
  }

  const valueLabel = humanizeIdentifier(valueColumn);
  const metricNames = [valueLabel];
  const metricDimensionColumns = headers.filter((header) => header.startsWith('waste') && header !== valueColumn);

  metricDimensionColumns.forEach((column) => {
    if (row[column]) {
      metricNames.push(`${humanizeIdentifier(column)}: ${row[column]}`);
    }
  });

  return metricNames;
}

function getCategory(categoriesById: Map<string, CategoryDataset>, filename: string, metricLabel: string) {
  const id = categoryKeyFromFilename(filename);
  const existingCategory = categoriesById.get(id);
  if (existingCategory) {
    if (!existingCategory.sourceFiles.includes(filename)) {
      existingCategory.sourceFiles.push(filename);
      existingCategory.description = `${existingCategory.label} from ${existingCategory.sourceFiles.join(', ')}`;
    }
    return existingCategory;
  }

  const category = createCategoryDataset(id, humanizeIdentifier(id), filename, metricLabel);
  categoriesById.set(id, category);
  return category;
}

function buildEprtrDataset(rawCsvByFilename: Record<string, string>): EprtrDataset {
  const industryNames = new Set<string>();
  const categoriesById = new Map<string, CategoryDataset>();
  const facilitySummaries = new Map<string, FacilitySummary>();
  const parsedFiles = Object.entries(rawCsvByFilename).map(([filename, csvText]) => {
    addIndustryNames(industryNames, csvText);
    const rows = parseCsvRows(csvText);
    const headers = rows[0] ? Object.keys(rows[0]) : [];
    const valueColumn = valueColumnFromHeaders(headers);
    const isSectorFile = filename.includes('_Sector');

    return { filename, rows, headers, valueColumn, isSectorFile };
  });

  const categoriesWithSectorFiles = new Set(
    parsedFiles
      .filter((file) => file.isSectorFile)
      .map((file) => categoryKeyFromFilename(file.filename)),
  );

  parsedFiles.forEach(({ filename, rows, headers, valueColumn, isSectorFile }) => {
    if (!valueColumn) {
      return;
    }

    const category = getCategory(categoriesById, filename, rows.some((row) => row.Pollutant) ? 'Pollutant' : humanizeIdentifier(valueColumn));
    const includeTrendValues = isSectorFile || !categoriesWithSectorFiles.has(category.id);
    const convertToTonnes = !valueColumn.toLowerCase().includes('waste');

    rows.forEach((row) => {
      const sectorName = row.EPRTR_SectorName;
      if (!sectorName) {
        return;
      }

      metricNamesFromRow(row, headers, valueColumn).forEach((metricName) => {
        addMetricName(category, metricName);
        const metricData = getMetricData(category, sectorName, metricName);
        const parsedAmount = numericValue(row[valueColumn]);
        const amount = parsedAmount === null ? 0 : convertToTonnes ? parsedAmount / 1000 : parsedAmount;

        if (includeTrendValues) {
          addAmountByYear(metricData, row.reportingYear, row[valueColumn], convertToTonnes);
        }

        if (!isSectorFile) {
          addFacilityPoint(metricData, row, amount);
          addCountryAmount(metricData, row, amount);
          addFacilitySummary(facilitySummaries, row, filename);
        }
      });
    });
  });

  const categories = Array.from(categoriesById.values())
    .map((category) => ({
      ...category,
      metrics: category.metrics
        .filter((metricName) =>
          Array.from(category.sectors.values()).some((sectorMetrics) => {
            const metricData = sectorMetrics.get(metricName);
            return metricData ? metricData.valuesByYear.size > 0 : false;
          }),
        )
        .sort((metricA, metricB) => metricA.localeCompare(metricB)),
    }))
    .sort((categoryA, categoryB) => categoryA.label.localeCompare(categoryB.label));

  const sortedCategoriesById = new Map(categories.map((category) => [category.id, category]));
  const industries = Array.from(industryNames).sort((industryA, industryB) => industryA.localeCompare(industryB));
  const allFacilities = Array.from(facilitySummaries.values()).sort((facilityA, facilityB) =>
    facilityA.name.localeCompare(facilityB.name),
  );

  return { industries, categories, categoriesById: sortedCategoriesById, allFacilities };
}

function getCategoryYears(category: CategoryDataset, metricName: string) {
  return Array.from(
    new Set(
      Array.from(category.sectors.values()).flatMap((sectorMetrics) => {
        const metricData = sectorMetrics.get(metricName);
        return metricData ? Array.from(metricData.valuesByYear.keys()) : [];
      }),
    ),
  )
    .sort((a, b) => a - b)
    .slice(-10);
}

// E-PRTR-backed comparison generator using the selected raw file category and metric.
function generateComparisonData(
  industry1: string,
  industry2: string,
  categoryId: string,
  metricName: string,
  dataset: EprtrDataset,
) {
  const category = dataset.categoriesById.get(categoryId);
  if (!category) {
    throw new Error(`Unknown E-PRTR category: ${categoryId}`);
  }

  const firstMetric = category.sectors.get(industry1)?.get(metricName);
  const secondMetric = category.sectors.get(industry2)?.get(metricName);
  const years = getCategoryYears(category, metricName);

  const getLocations = (metricData?: MetricData) => {
    if (!metricData) {
      return [];
    }

    const seenLocations = new Set<string>();
    return [...metricData.locationCandidates]
      .sort((a, b) => b.amount - a.amount)
      .filter((location) => {
        const locationKey = `${location.country}-${location.lat}-${location.lon}`;
        if (seenLocations.has(locationKey)) {
          return false;
        }
        seenLocations.add(locationKey);
        return true;
      })
      .slice(0, maxMappedLocations)
      .map(({ country, lat, lon }) => ({ country, lat, lon }));
  };

  const getCountryBreakdown = (metricData?: MetricData): CountryFootprint[] => {
    if (!metricData) {
      return [];
    }

    const countries = new Map<string, { amount: number; facilityIds: Set<string> }>();

    metricData.locationCandidates.forEach((location) => {
      const country = location.country || 'Unknown country';
      const countryData = countries.get(country) ?? { amount: 0, facilityIds: new Set<string>() };
      countryData.amount += location.amount;
      countryData.facilityIds.add(location.facilityId);
      countries.set(country, countryData);
    });

    return Array.from(countries.entries())
      .map(([country, countryData]) => ({
        country,
        amount: countryData.amount,
        facilities: countryData.facilityIds.size,
      }))
      .sort((countryA, countryB) => countryB.amount - countryA.amount)
      .slice(0, 6);
  };

  const emissionsData = years.map((year) => ({
    year,
    industry1: Math.round(firstMetric?.valuesByYear.get(year) ?? 0),
    industry2: Math.round(secondMetric?.valuesByYear.get(year) ?? 0),
  }));

  const facilities = {
    count1: firstMetric?.facilityIds.size ?? 0,
    count2: secondMetric?.facilityIds.size ?? 0,
  };

  const locations1 = getLocations(firstMetric);
  const locations2 = getLocations(secondMetric);
  const countryBreakdown1 = getCountryBreakdown(firstMetric);
  const countryBreakdown2 = getCountryBreakdown(secondMetric);

  return {
    emissionsData,
    facilities,
    locations1,
    locations2,
    countryBreakdown1,
    countryBreakdown2,
    categoryId,
    categoryLabel: category.label,
    metricName,
    unitLabel: categoryUnitLabel,
    valueLabel: category.valueLabel,
  };
}

type ComparisonData = ReturnType<typeof generateComparisonData>;

interface ActiveComparison {
  industry1: string;
  industry2: string;
  categoryId: string;
  metricName: string;
  data: ComparisonData;
}

function averageEmissions(data: ComparisonData['emissionsData'], key: 'industry1' | 'industry2') {
  if (!data.length) {
    return 0;
  }

  return data.reduce((sum, item) => sum + item[key], 0) / data.length;
}

function getCountryMetricData(dataset: EprtrDataset | null, industry: string, categoryId: string, metricName: string) {
  if (!dataset || !industry || !categoryId || !metricName) {
    return undefined;
  }

  return dataset.categoriesById.get(categoryId)?.sectors.get(industry)?.get(metricName);
}

function getCountryOptions(dataset: EprtrDataset | null, industry: string, categoryId: string, metricName: string) {
  const metricData = getCountryMetricData(dataset, industry, categoryId, metricName);

  if (!metricData) {
    return [];
  }

  return Array.from(metricData.countryValuesByYear.keys()).sort((countryA, countryB) =>
    countryA.localeCompare(countryB),
  );
}

function generateCountryComparisonData(
  dataset: EprtrDataset | null,
  industry: string,
  categoryId: string,
  metricName: string,
  country1: string,
  country2: string,
): CountryComparisonData | null {
  const metricData = getCountryMetricData(dataset, industry, categoryId, metricName);

  if (!metricData || !country1 || !country2 || country1 === country2) {
    return null;
  }

  const country1Values = metricData.countryValuesByYear.get(country1) ?? new Map<number, number>();
  const country2Values = metricData.countryValuesByYear.get(country2) ?? new Map<number, number>();
  const years = Array.from(new Set([...country1Values.keys(), ...country2Values.keys()]))
    .sort((yearA, yearB) => yearA - yearB)
    .slice(-10);

  return {
    data: years.map((year) => ({
      year,
      industry1: Math.round(country1Values.get(year) ?? 0),
      industry2: Math.round(country2Values.get(year) ?? 0),
    })),
    country1Total: Array.from(country1Values.values()).reduce((sum, amount) => sum + amount, 0),
    country2Total: Array.from(country2Values.values()).reduce((sum, amount) => sum + amount, 0),
    country1Facilities: metricData.countryFacilityIds.get(country1)?.size ?? 0,
    country2Facilities: metricData.countryFacilityIds.get(country2)?.size ?? 0,
  };
}

function distanceKm(latA: number, lonA: number, latB: number, lonB: number) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(latB - latA);
  const deltaLon = toRadians(lonB - lonA);
  const originLat = toRadians(latA);
  const targetLat = toRadians(latB);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(originLat) * Math.cos(targetLat) * Math.sin(deltaLon / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getBrowserPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Browser location is not available.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 60_000,
      timeout: 12_000,
    });
  });
}

function pointInRing(lon: number, lat: number, ring: GeoJsonRing) {
  let inside = false;

  for (let index = 0, previousIndex = ring.length - 1; index < ring.length; previousIndex = index, index += 1) {
    const [currentLon, currentLat] = ring[index];
    const [previousLon, previousLat] = ring[previousIndex];
    const intersects =
      currentLat > lat !== previousLat > lat &&
      lon < ((previousLon - currentLon) * (lat - currentLat)) / (previousLat - currentLat) + currentLon;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInPolygon(lon: number, lat: number, polygon: GeoJsonPolygon) {
  if (!polygon.length || !pointInRing(lon, lat, polygon[0])) {
    return false;
  }

  return !polygon.slice(1).some((hole) => pointInRing(lon, lat, hole));
}

function projectedPointDistanceKm(
  originLat: number,
  originLon: number,
  segmentStart: GeoJsonPosition,
  segmentEnd: GeoJsonPosition,
) {
  const kmPerDegreeLat = 111.32;
  const kmPerDegreeLon = 111.32 * Math.cos((originLat * Math.PI) / 180);
  const startX = (segmentStart[0] - originLon) * kmPerDegreeLon;
  const startY = (segmentStart[1] - originLat) * kmPerDegreeLat;
  const endX = (segmentEnd[0] - originLon) * kmPerDegreeLon;
  const endY = (segmentEnd[1] - originLat) * kmPerDegreeLat;
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const segmentLengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (segmentLengthSquared === 0) {
    return Math.sqrt(startX * startX + startY * startY);
  }

  const projection = Math.max(0, Math.min(1, -(startX * deltaX + startY * deltaY) / segmentLengthSquared));
  const closestX = startX + projection * deltaX;
  const closestY = startY + projection * deltaY;

  return Math.sqrt(closestX * closestX + closestY * closestY);
}

function ringDistanceKm(lat: number, lon: number, ring: GeoJsonRing) {
  if (ring.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  let minDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < ring.length - 1; index += 1) {
    minDistance = Math.min(minDistance, projectedPointDistanceKm(lat, lon, ring[index], ring[index + 1]));
  }

  return minDistance;
}

function polygonDistanceKm(lat: number, lon: number, polygon: GeoJsonPolygon) {
  if (pointInPolygon(lon, lat, polygon)) {
    return 0;
  }

  return Math.min(...polygon.map((ring) => ringDistanceKm(lat, lon, ring)));
}

function protectedAreaDistanceKm(lat: number, lon: number, geometry: GeoJsonGeometry) {
  switch (geometry.type) {
    case 'Point':
      return distanceKm(lat, lon, geometry.coordinates[1], geometry.coordinates[0]);
    case 'MultiPoint':
      return Math.min(...geometry.coordinates.map((point) => distanceKm(lat, lon, point[1], point[0])));
    case 'Polygon':
      return polygonDistanceKm(lat, lon, geometry.coordinates);
    case 'MultiPolygon':
      return Math.min(...geometry.coordinates.map((polygon) => polygonDistanceKm(lat, lon, polygon)));
    default:
      return Number.POSITIVE_INFINITY;
  }
}

function protectedAreaTypeLabel(typeCode?: string) {
  const typeLabels: Record<string, string> = {
    DVO: 'Animal and plant protection area',
    IF: 'Interim protection area',
    KR: 'Cultural reserve',
    LBSO: 'Landscape protection area',
    NP: 'National park',
    NM: 'Natural monument',
    NR: 'Nature reserve',
    NVO: 'Nature conservation area',
    VSO: 'Water protection area',
    OBO: 'Biotope protection area',
  };

  return typeCode ? typeLabels[typeCode] ?? typeCode : 'Protected area';
}

async function fetchNearbyProtectedAreas(lat: number, lon: number) {
  const response = await fetch(protectedAreasUrl);

  if (!response.ok) {
    throw new Error('Could not load Naturvårdsverket protected-area GeoJSON.');
  }

  const featureCollection = (await response.json()) as ProtectedAreaFeatureCollection;

  return featureCollection.features
    .filter((feature) => feature.geometry)
    .map((feature) => ({
      id: feature.properties.NVRID || `${feature.properties.NAMN}-${feature.properties.skyddstyp}`,
      name: feature.properties.NAMN || 'Unnamed protected area',
      type: protectedAreaTypeLabel(feature.properties.skyddstyp),
      distanceKm: protectedAreaDistanceKm(lat, lon, feature.geometry as GeoJsonGeometry),
    }))
    .filter((area) => area.distanceKm <= 25)
    .sort((areaA, areaB) => areaA.distanceKm - areaB.distanceKm)
    .slice(0, 6);
}

export default function App() {
  const [eprtrDataset, setEprtrDataset] = useState<EprtrDataset | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [industry1, setIndustry1] = useState('');
  const [industry2, setIndustry2] = useState('');
  const [pollutionCategory, setPollutionCategory] = useState('');
  const [pollutionMetric, setPollutionMetric] = useState('');
  const [comparison, setComparison] = useState<ActiveComparison | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [nearbyStatus, setNearbyStatus] = useState<NearbyStatus>('idle');
  const [nearbyError, setNearbyError] = useState('');
  const [nearbyResult, setNearbyResult] = useState<NearbyResult | null>(null);
  const [activePage, setActivePage] = useState<'dashboard' | 'country-detail'>('dashboard');
  const [countryDetailIndustry, setCountryDetailIndustry] = useState('');
  const [countryDetailCategory, setCountryDetailCategory] = useState('');
  const [countryDetailMetric, setCountryDetailMetric] = useState('');
  const [countryDetailCountry1, setCountryDetailCountry1] = useState('');
  const [countryDetailCountry2, setCountryDetailCountry2] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadEprtrDataset() {
      try {
        const fileEntries = Object.entries(eprtrRawFileUrls)
          .map(([path, url]) => ({ filename: filenameFromPath(path), url }))
          .sort((fileA, fileB) => fileA.filename.localeCompare(fileB.filename));

        const responses = await Promise.all(fileEntries.map((file) => fetch(file.url)));

        if (responses.some((response) => !response.ok)) {
          throw new Error('Could not load E-PRTR CSV assets.');
        }

        const csvTexts = await Promise.all(responses.map((response) => response.text()));
        const rawCsvByFilename = fileEntries.reduce<Record<string, string>>((files, file, index) => {
          files[file.filename] = csvTexts[index];
          return files;
        }, {});

        if (isActive) {
          setEprtrDataset(buildEprtrDataset(rawCsvByFilename));
          setDataError(null);
        }
      } catch (error) {
        if (isActive) {
          setDataError(error instanceof Error ? error.message : 'Could not load E-PRTR data.');
        }
      }
    }

    loadEprtrDataset();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const storedUser = window.localStorage.getItem(accountStorageKey);

    if (!storedUser) {
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as { email?: string };
      if (parsedUser.email) {
        setUserEmail(parsedUser.email);
      }
    } catch {
      window.localStorage.removeItem(accountStorageKey);
    }
  }, []);

  const industries = eprtrDataset?.industries ?? [];
  const categoryOptions = eprtrDataset?.categories ?? [];
  const selectedCategory = eprtrDataset?.categoriesById.get(pollutionCategory);
  const metricOptions = selectedCategory?.metrics ?? [];
  const selectedCountryDetailCategory = eprtrDataset?.categoriesById.get(countryDetailCategory);
  const countryDetailMetricOptions = selectedCountryDetailCategory?.metrics ?? [];
  const countryDetailCountries = getCountryOptions(
    eprtrDataset,
    countryDetailIndustry,
    countryDetailCategory,
    countryDetailMetric,
  );
  const countryDetailComparison = generateCountryComparisonData(
    eprtrDataset,
    countryDetailIndustry,
    countryDetailCategory,
    countryDetailMetric,
    countryDetailCountry1,
    countryDetailCountry2,
  );

  useEffect(() => {
    if (!pollutionCategory) {
      return;
    }

    if (!categoryOptions.length || !categoryOptions.some((category) => category.id === pollutionCategory)) {
      setPollutionCategory('');
    }
  }, [categoryOptions, pollutionCategory]);

  useEffect(() => {
    if (!pollutionMetric) {
      return;
    }

    if (!metricOptions.length || !metricOptions.includes(pollutionMetric)) {
      setPollutionMetric('');
    }
  }, [metricOptions, pollutionMetric]);

  const handlePollutionCategoryChange = (categoryId: string) => {
    setPollutionCategory(categoryId);
    setPollutionMetric('');
  };

  useEffect(() => {
    if (!industries.length) {
      setCountryDetailIndustry('');
      return;
    }

    if (!industries.includes(countryDetailIndustry)) {
      setCountryDetailIndustry(comparison?.industry1 && industries.includes(comparison.industry1) ? comparison.industry1 : industries[0]);
    }
  }, [industries, countryDetailIndustry, comparison]);

  useEffect(() => {
    if (!categoryOptions.length) {
      setCountryDetailCategory('');
      return;
    }

    if (!categoryOptions.some((category) => category.id === countryDetailCategory)) {
      setCountryDetailCategory(
        comparison?.categoryId && categoryOptions.some((category) => category.id === comparison.categoryId)
          ? comparison.categoryId
          : categoryOptions[0].id,
      );
    }
  }, [categoryOptions, countryDetailCategory, comparison]);

  useEffect(() => {
    if (!countryDetailMetricOptions.length) {
      setCountryDetailMetric('');
      return;
    }

    if (!countryDetailMetricOptions.includes(countryDetailMetric)) {
      setCountryDetailMetric(
        comparison?.metricName && countryDetailMetricOptions.includes(comparison.metricName)
          ? comparison.metricName
          : countryDetailMetricOptions[0],
      );
    }
  }, [countryDetailMetricOptions, countryDetailMetric, comparison]);

  useEffect(() => {
    if (!countryDetailCountries.length) {
      setCountryDetailCountry1('');
      setCountryDetailCountry2('');
      return;
    }

    const preferredCountry1 = comparison?.data.countryBreakdown1[0]?.country;
    const preferredCountry2 = comparison?.data.countryBreakdown1.find((country) => country.country !== preferredCountry1)?.country;
    const fallbackCountry1 =
      preferredCountry1 && countryDetailCountries.includes(preferredCountry1)
        ? preferredCountry1
        : countryDetailCountries[0];
    const fallbackCountry2 =
      preferredCountry2 && countryDetailCountries.includes(preferredCountry2)
        ? preferredCountry2
        : countryDetailCountries.find((country) => country !== fallbackCountry1) ?? '';

    if (!countryDetailCountries.includes(countryDetailCountry1)) {
      setCountryDetailCountry1(fallbackCountry1);
    }

    if (!countryDetailCountries.includes(countryDetailCountry2) || countryDetailCountry2 === countryDetailCountry1) {
      setCountryDetailCountry2(fallbackCountry2);
    }
  }, [countryDetailCountries, countryDetailCountry1, countryDetailCountry2, comparison]);

  const handleCompare = () => {
    if (eprtrDataset && industry1 && industry2 && industry1 !== industry2 && pollutionMetric) {
      setComparison({
        industry1,
        industry2,
        categoryId: pollutionCategory,
        metricName: pollutionMetric,
        data: generateComparisonData(industry1, industry2, pollutionCategory, pollutionMetric, eprtrDataset),
      });
    }
  };

  const openCountryDetailPage = () => {
    if (comparison) {
      setCountryDetailIndustry(comparison.industry1);
      setCountryDetailCategory(comparison.categoryId);
      setCountryDetailMetric(comparison.metricName);
      setCountryDetailCountry1(comparison.data.countryBreakdown1[0]?.country ?? '');
      setCountryDetailCountry2(comparison.data.countryBreakdown1[1]?.country ?? '');
    }

    setActivePage('country-detail');
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const handleLogin = (email: string) => {
    window.localStorage.setItem(accountStorageKey, JSON.stringify({ email }));
    setUserEmail(email);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(accountStorageKey);
    setUserEmail(null);
    setNearbyStatus('idle');
    setNearbyError('');
    setNearbyResult(null);
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleNearMeCheck = async () => {
    if (!eprtrDataset) {
      return;
    }

    setNearbyStatus('loading');
    setNearbyError('');

    try {
      const position = await getBrowserPosition();
      const { latitude, longitude } = position.coords;
      const factories = eprtrDataset.allFacilities
        .map((facility) => ({
          ...facility,
          distanceKm: distanceKm(latitude, longitude, facility.lat, facility.lon),
        }))
        .filter((facility) => facility.distanceKm <= 50)
        .sort((facilityA, facilityB) => facilityA.distanceKm - facilityB.distanceKm)
        .slice(0, 6);

      let protectedAreas: ProtectedAreaHit[] = [];
      let protectedAreaNote = 'Naturvårdsverket protected-area geometry loaded from the Halland GeoJSON dataset.';

      try {
        protectedAreas = await fetchNearbyProtectedAreas(latitude, longitude);
        protectedAreaNote = protectedAreas.length
          ? 'Found Naturvårdsverket protected-area polygons within 25 km.'
          : 'No Naturvårdsverket protected-area polygons were found within 25 km in the Halland GeoJSON dataset.';
      } catch (error) {
        protectedAreaNote =
          error instanceof Error
            ? error.message
            : 'Could not complete the Naturvårdsverket protected-area lookup right now.';
      }

      setNearbyResult({
        lat: latitude,
        lon: longitude,
        factories,
        protectedAreas,
        protectedAreaNote,
      });
      setNearbyStatus('ready');
    } catch (error) {
      setNearbyError(error instanceof Error ? error.message : 'Could not read your browser location.');
      setNearbyStatus('error');
    }
  };

  const reportInsights = useMemo(() => {
    if (!comparison) {
      return null;
    }

    const average1 = averageEmissions(comparison.data.emissionsData, 'industry1');
    const average2 = averageEmissions(comparison.data.emissionsData, 'industry2');
    const higherEmissionIndustry = average1 >= average2 ? comparison.industry1 : comparison.industry2;
    const lowerEmissionIndustry = average1 >= average2 ? comparison.industry2 : comparison.industry1;
    const emissionsGap = Math.abs(average1 - average2);
    const facilityGap = Math.abs(comparison.data.facilities.count1 - comparison.data.facilities.count2);
    const widerFacilityIndustry =
      comparison.data.facilities.count1 >= comparison.data.facilities.count2
        ? comparison.industry1
        : comparison.industry2;

    return {
      emissionsGap,
      facilityGap,
      higherEmissionIndustry,
      lowerEmissionIndustry,
      widerFacilityIndustry,
    };
  }, [comparison]);

  const maxCountryFootprint = comparison
    ? Math.max(
        1,
        ...comparison.data.countryBreakdown1.map((country) => country.amount),
        ...comparison.data.countryBreakdown2.map((country) => country.amount),
      )
    : 1;

  if (activePage === 'country-detail' && userEmail) {
    return (
      <div className="min-h-screen bg-[#111b24] text-[#14212b]">
        <div
          className="pointer-events-none fixed inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(17, 27, 36, 0.42), rgba(17, 27, 36, 0.88)), url(${brandPhoto})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative container mx-auto px-4 py-8 sm:px-6 lg:py-12">
          <header className="mb-10 flex items-center justify-between gap-4">
            <a
              href="https://www.iconsof.se/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open Icons Of website"
              className="flex min-w-0 items-center gap-4"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white shadow-lg shadow-black/15">
                <span className="text-3xl font-black leading-none text-[#f3703d]">Of</span>
              </div>
              <img src={brandLogo} alt="Icons Of" className="h-9 w-auto max-w-[180px] object-contain" />
            </a>
            <button
              type="button"
              onClick={() => setActivePage('dashboard')}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/85 backdrop-blur transition hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </button>
          </header>

          <div className="mx-auto max-w-7xl space-y-8">
            <motion.section
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="rounded-lg border border-white/70 bg-white p-5 shadow-xl shadow-black/15 sm:p-8"
            >
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-[#14212b] px-3 py-2 text-xs font-bold text-white">
                    <FileText className="h-4 w-4 text-[#ff7a18]" />
                    Paid country detail
                  </div>
                  <h1 className="text-3xl font-black leading-tight text-[#14212b] sm:text-4xl">
                    Country-by-country footprint
                  </h1>
                  <p className="mt-3 max-w-3xl text-base leading-7 text-[#526371]">
                    Choose one industry, two countries, and a pollution metric to compare where reported facility-level footprint is concentrated.
                  </p>
                </div>
                <p className="rounded-lg bg-[#eef9fd] px-3 py-2 text-xs font-bold uppercase text-[#168fca]">
                  Unlocked for {userEmail}
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <IndustrySelector
                  label="Industry"
                  value={countryDetailIndustry}
                  onChange={setCountryDetailIndustry}
                  industries={industries}
                  color="border-[#25a9e0]/30 focus:border-[#25a9e0] focus:ring-[#25a9e0]"
                />

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-[#14212b]">Pollution Category</label>
                  <div className="relative">
                    <select
                      value={countryDetailCategory}
                      onChange={(event) => setCountryDetailCategory(event.target.value)}
                      className="w-full cursor-pointer appearance-none rounded-lg border-2 border-[#f3703d]/30 bg-[#f8fafb] px-5 py-4 pr-12 text-[#14212b] transition-all hover:bg-white hover:shadow-md focus:border-[#f3703d] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#f3703d] focus:ring-opacity-20"
                    >
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#526371]" />
                  </div>
                  <p className="text-xs leading-5 text-[#526371]">{selectedCountryDetailCategory?.description}</p>
                </div>

                <IndustrySelector
                  label={selectedCountryDetailCategory?.metricLabel ?? 'Pollution Metric'}
                  value={countryDetailMetric}
                  onChange={setCountryDetailMetric}
                  industries={countryDetailMetricOptions}
                  color="border-[#14212b]/20 focus:border-[#14212b] focus:ring-[#14212b]"
                  placeholder="Select metric..."
                />
                <IndustrySelector
                  label="First Country"
                  value={countryDetailCountry1}
                  onChange={setCountryDetailCountry1}
                  industries={countryDetailCountries}
                  color="border-[#25a9e0]/30 focus:border-[#25a9e0] focus:ring-[#25a9e0]"
                  placeholder="Select country..."
                />
                <IndustrySelector
                  label="Second Country"
                  value={countryDetailCountry2}
                  onChange={setCountryDetailCountry2}
                  industries={countryDetailCountries.filter((country) => country !== countryDetailCountry1)}
                  color="border-[#f05a9d]/30 focus:border-[#f05a9d] focus:ring-[#f05a9d]"
                  placeholder="Select country..."
                />
              </div>
            </motion.section>

            <ComparisonCard
              title={`${countryDetailMetric || 'Metric'} Release Trends by Country`}
              icon={<TrendingUp className="w-6 h-6" />}
              delay={0.1}
              shareId="country-detail-trends"
              shareText={`I compared country-level ${countryDetailMetric} footprint for ${countryDetailIndustry} in Industry Duel.`}
            >
              {countryDetailComparison && countryDetailComparison.data.length ? (
                <>
                  <EmissionsChart
                    industry1={countryDetailCountry1}
                    industry2={countryDetailCountry2}
                    data={countryDetailComparison.data}
                    yAxisLabel={categoryUnitLabel}
                    tooltipLabel={selectedCountryDetailCategory?.valueLabel ?? 'Reported amount'}
                    unitLabel={categoryUnitLabel}
                  />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="border-l-4 border-[#25a9e0] bg-[#eef9fd] p-4">
                      <p className="mb-1 text-sm text-[#526371]">Total reported footprint</p>
                      <p className="text-2xl font-black text-[#168fca]">
                        {Math.round(countryDetailComparison.country1Total).toLocaleString()} {categoryUnitLabel}
                      </p>
                      <p className="mt-1 text-xs text-[#526371]">
                        {countryDetailCountry1} · {countryDetailComparison.country1Facilities} facilities
                      </p>
                    </div>
                    <div className="border-l-4 border-[#f05a9d] bg-[#fff0f7] p-4">
                      <p className="mb-1 text-sm text-[#526371]">Total reported footprint</p>
                      <p className="text-2xl font-black text-[#d83d87]">
                        {Math.round(countryDetailComparison.country2Total).toLocaleString()} {categoryUnitLabel}
                      </p>
                      <p className="mt-1 text-xs text-[#526371]">
                        {countryDetailCountry2} · {countryDetailComparison.country2Facilities} facilities
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-[#d9e2e8] bg-[#f8fafb] p-5 text-sm leading-6 text-[#526371]">
                  Choose an industry, two different countries, and a pollution metric with facility-level records.
                </div>
              )}
            </ComparisonCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111b24] text-[#14212b]">
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(17, 27, 36, 0.42), rgba(17, 27, 36, 0.88)), url(${brandPhoto})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="relative container mx-auto px-4 py-8 sm:px-6 lg:py-12">
        <header className="mb-12 flex items-center justify-between gap-4">
          <a
            href="https://www.iconsof.se/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Icons Of website"
            className="flex min-w-0 items-center gap-5"
          >
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-white shadow-lg shadow-black/15">
              <span className="text-5xl font-black leading-none text-[#f3703d]">Of</span>
            </div>
            <img src={brandLogo} alt="Icons Of" className="h-16 w-auto max-w-[300px] object-contain" />
          </a>
        </header>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 max-w-4xl"
        >
          <h1 className="mb-5 text-5xl font-black leading-none text-white sm:text-6xl lg:text-7xl">
            Industry Duel
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-white/72">
            Compare European E-PRTR emission trends, facilities, and geographic spread with an Icons Of inspired interface built around bold color, clear contrast, and open data.
          </p>
        </motion.div>

        {/* Industry Selectors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto max-w-5xl"
        >
          <div className="mb-8 rounded-lg border border-white/20 bg-white p-5 shadow-2xl shadow-black/25 sm:p-8">
            {(dataError || !eprtrDataset) && (
              <div className="mb-5 rounded-lg border border-[#d9e2e8] bg-[#f8fafb] px-4 py-3 text-sm text-[#526371]">
                {dataError ?? 'Loading raw E-PRTR industry, sector, and facility data...'}
              </div>
            )}
            <div className="mb-8 grid gap-6 md:grid-cols-2">
              <IndustrySelector
                label="First Industry"
                value={industry1}
                onChange={setIndustry1}
                industries={industries}
                color="border-[#25a9e0]/30 focus:border-[#25a9e0] focus:ring-[#25a9e0]"
              />
              <IndustrySelector
                label="Second Industry"
                value={industry2}
                onChange={setIndustry2}
                industries={industries}
                color="border-[#f05a9d]/30 focus:border-[#f05a9d] focus:ring-[#f05a9d]"
              />
              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-[#14212b]">Pollution Category</label>
                <div className="relative">
                  <select
                    value={pollutionCategory}
                    onChange={(event) => handlePollutionCategoryChange(event.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-lg border-2 border-[#f3703d]/30 bg-[#f8fafb] px-5 py-4 pr-12 text-[#14212b] transition-all hover:bg-white hover:shadow-md focus:border-[#f3703d] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#f3703d] focus:ring-opacity-20"
                  >
                    <option value="">Select category...</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#526371]" />
                </div>
                <p className="text-xs leading-5 text-[#526371]">
                  {selectedCategory?.description}
                </p>
              </div>
              <IndustrySelector
                label={selectedCategory?.metricLabel ?? 'Pollutant / Metric'}
                value={pollutionMetric}
                onChange={setPollutionMetric}
                industries={metricOptions}
                color="border-[#14212b]/20 focus:border-[#14212b] focus:ring-[#14212b]"
                placeholder={selectedCategory ? `Select ${selectedCategory.metricLabel.toLowerCase()}...` : 'Select category first...'}
              />
            </div>
            <button
              onClick={handleCompare}
              disabled={!eprtrDataset || !industry1 || !industry2 || industry1 === industry2 || !pollutionMetric}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f3703d] px-6 py-4 font-bold text-white shadow-lg shadow-[#f3703d]/25 transition-all hover:bg-[#ff7a18] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-45"
            >
              {eprtrDataset ? 'Compare Industries' : 'Loading data'}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>

        {/* Comparison Results */}
        {comparison && (
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Emissions Trends */}
            <ComparisonCard
              title={`${comparison.data.metricName} ${comparison.data.categoryLabel} Trends`}
              icon={<TrendingUp className="w-6 h-6" />}
              delay={0.3}
              shareId="emission-trends"
              shareText={`I compared ${comparison.data.metricName} ${comparison.data.categoryLabel.toLowerCase()} for ${comparison.industry1} and ${comparison.industry2} in Industry Duel, an Icons Of open data dashboard for exploring industrial impact across Europe.`}
            >
              <EmissionsChart
                industry1={comparison.industry1}
                industry2={comparison.industry2}
                data={comparison.data.emissionsData}
                yAxisLabel={comparison.data.unitLabel}
                tooltipLabel={comparison.data.valueLabel}
                unitLabel={comparison.data.unitLabel}
              />
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="border-l-4 border-[#25a9e0] bg-[#eef9fd] p-4">
                  <p className="mb-1 text-sm text-[#526371]">Average annual amount</p>
                  <p className="text-2xl font-black text-[#168fca]">
                    {Math.round(averageEmissions(comparison.data.emissionsData, 'industry1')).toLocaleString()} {comparison.data.unitLabel}
                  </p>
                  <p className="mt-1 text-xs text-[#526371]">{comparison.industry1}</p>
                </div>
                <div className="border-l-4 border-[#f05a9d] bg-[#fff0f7] p-4">
                  <p className="mb-1 text-sm text-[#526371]">Average annual amount</p>
                  <p className="text-2xl font-black text-[#d83d87]">
                    {Math.round(averageEmissions(comparison.data.emissionsData, 'industry2')).toLocaleString()} {comparison.data.unitLabel}
                  </p>
                  <p className="mt-1 text-xs text-[#526371]">{comparison.industry2}</p>
                </div>
              </div>
            </ComparisonCard>

            {/* Number of Facilities */}
            <ComparisonCard
              title={`${comparison.data.categoryLabel} Reporting Facilities`}
              icon={<Factory className="w-6 h-6" />}
              delay={0.4}
              shareId="facility-counts"
              shareText={`I compared facility counts for ${comparison.industry1} and ${comparison.industry2} in Industry Duel. The dashboard makes European industrial data easier to scan and discuss.`}
            >
              <FacilitiesComparison
                industry1={comparison.industry1}
                industry2={comparison.industry2}
                count1={comparison.data.facilities.count1}
                count2={comparison.data.facilities.count2}
              />
              <div className="mt-4 text-center">
                <p className="text-sm text-[#526371]">
                  {comparison.data.facilities.count1 > comparison.data.facilities.count2 ? (
                    <span><strong>{comparison.industry1}</strong> has <strong>{Math.abs(comparison.data.facilities.count1 - comparison.data.facilities.count2)}</strong> more facilities</span>
                  ) : comparison.data.facilities.count2 > comparison.data.facilities.count1 ? (
                    <span><strong>{comparison.industry2}</strong> has <strong>{Math.abs(comparison.data.facilities.count1 - comparison.data.facilities.count2)}</strong> more facilities</span>
                  ) : (
                    <span>Both industries have an equal number of facilities</span>
                  )}
                </p>
              </div>
            </ComparisonCard>

            {/* Geographic Spread */}
            <ComparisonCard
              title={`${comparison.data.categoryLabel} Geographic Distribution`}
              icon={<MapPin className="w-6 h-6" />}
              delay={0.5}
              shareId="geographic-distribution"
              shareText={`I explored the geographic distribution of ${comparison.industry1} and ${comparison.industry2} facilities in Industry Duel, using open data to compare industrial footprints across Europe.`}
            >
              <GeographicSpread
                industry1={comparison.industry1}
                industry2={comparison.industry2}
                locations1={comparison.data.locations1}
                locations2={comparison.data.locations2}
              />
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="border-l-4 border-[#25a9e0] bg-[#eef9fd] p-4 text-center">
                  <p className="mb-1 text-sm text-[#526371]">Mapped E-PRTR facilities</p>
                  <p className="text-2xl font-black text-[#168fca]">{comparison.data.locations1.length} sites</p>
                  <p className="mt-1 text-xs text-[#526371]">{comparison.industry1}</p>
                </div>
                <div className="border-l-4 border-[#f05a9d] bg-[#fff0f7] p-4 text-center">
                  <p className="mb-1 text-sm text-[#526371]">Mapped E-PRTR facilities</p>
                  <p className="text-2xl font-black text-[#d83d87]">{comparison.data.locations2.length} sites</p>
                  <p className="mt-1 text-xs text-[#526371]">{comparison.industry2}</p>
                </div>
              </div>
            </ComparisonCard>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="rounded-lg border border-white/70 bg-white p-5 shadow-xl shadow-black/15 sm:p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#14212b] text-[#ff7a18]">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#14212b]">Want the full report?</h3>
                  <p className="text-sm text-[#526371]">
                    Create an account to unlock a benchmark report plus country-by-country detail for these two industries.
                  </p>
                </div>
              </div>

              <AccountGate
                userEmail={userEmail}
                onLogin={handleLogin}
                onLogout={handleLogout}
                onCountryDetail={openCountryDetailPage}
              />

              {userEmail && reportInsights && (
                <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-lg border border-[#d9e2e8] p-5">
                    <p className="mb-4 text-sm font-bold text-[#14212b]">Unlocked insights</p>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <p className="text-xs uppercase text-[#526371]">Average amount gap</p>
                        <p className="mt-1 text-2xl font-black text-[#14212b]">
                          {Math.round(reportInsights.emissionsGap).toLocaleString()} {comparison.data.unitLabel}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#526371]">
                          {reportInsights.higherEmissionIndustry} averages higher than {reportInsights.lowerEmissionIndustry}.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-[#526371]">Facility gap</p>
                        <p className="mt-1 text-2xl font-black text-[#14212b]">{reportInsights.facilityGap}</p>
                        <p className="mt-1 text-xs leading-5 text-[#526371]">
                          {reportInsights.widerFacilityIndustry} has the larger facility footprint.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-[#526371]">Priority next step</p>
                        <p className="mt-1 text-base font-black text-[#14212b]">Regional review</p>
                        <p className="mt-1 text-xs leading-5 text-[#526371]">
                          Compare top reporting countries before setting reduction targets.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#d9e2e8] bg-[#f8fafb] p-5">
                    <p className="mb-4 text-sm font-bold text-[#14212b]">Account actions</p>
                    <div className="grid gap-3">
                      <button
                        type="button"
                        onClick={handleExportPdf}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f3703d] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#ff7a18]"
                      >
                        <Download className="h-4 w-4" />
                        Save website as PDF
                      </button>
                      <button
                        type="button"
                        onClick={handleNearMeCheck}
                        disabled={nearbyStatus === 'loading' || !eprtrDataset}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#14212b]/15 bg-white px-4 py-3 text-sm font-bold text-[#14212b] transition hover:border-[#14212b]/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {nearbyStatus === 'loading' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                        Check factory or protected-area around your room
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#d9e2e8] bg-white p-5 lg:col-span-2">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-[#14212b]">Country-by-country detail</p>
                        <p className="mt-1 text-sm leading-6 text-[#526371]">
                          Inspect where each selected industry reports the largest footprint for {comparison.data.metricName}.
                        </p>
                      </div>
                      <span className="text-xs font-bold uppercase text-[#526371]">
                        Top reporting countries
                      </span>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {[
                        {
                          industry: comparison.industry1,
                          colorClass: 'bg-[#25a9e0]',
                          softClass: 'bg-[#eef9fd]',
                          textClass: 'text-[#168fca]',
                          countries: comparison.data.countryBreakdown1,
                        },
                        {
                          industry: comparison.industry2,
                          colorClass: 'bg-[#f05a9d]',
                          softClass: 'bg-[#fff0f7]',
                          textClass: 'text-[#d83d87]',
                          countries: comparison.data.countryBreakdown2,
                        },
                      ].map((group) => (
                        <div key={group.industry} className="rounded-lg border border-[#d9e2e8] bg-[#f8fafb] p-4">
                          <p className="mb-4 text-sm font-black text-[#14212b]">{group.industry}</p>
                          {group.countries.length ? (
                            <div className="space-y-3">
                              {group.countries.map((country, index) => (
                                <div key={`${group.industry}-${country.country}`}>
                                  <div className="mb-1 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-black text-[#14212b]">
                                        {index + 1}. {country.country}
                                      </p>
                                      <p className="text-xs text-[#526371]">{country.facilities} reporting facilities</p>
                                    </div>
                                    <p className={`shrink-0 text-sm font-black ${group.textClass}`}>
                                      {Math.round(country.amount).toLocaleString()} {comparison.data.unitLabel}
                                    </p>
                                  </div>
                                  <div className={`h-2 overflow-hidden rounded-full ${group.softClass}`}>
                                    <div
                                      className={`h-full rounded-full ${group.colorClass}`}
                                      style={{
                                        width: `${Math.max(6, (country.amount / maxCountryFootprint) * 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-lg bg-white p-3 text-sm text-[#526371]">
                              No facility-level country data is available for this selection.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-[#d9e2e8] bg-white p-5 lg:col-span-2">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-2xl">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-[#14212b] px-3 py-2 text-xs font-bold text-white">
                          <LocateFixed className="h-4 w-4 text-[#ff7a18]" />
                          VIP near-me check
                        </div>
                        <h4 className="text-xl font-black text-[#14212b]">Any factories or Naturvårdsverket areas near my room?</h4>
                        <p className="mt-2 text-sm leading-6 text-[#526371]">
                          Uses your browser location, raw E-PRTR facility coordinates, and Naturvårdsverket protected-area polygons from the Halland GeoJSON dataset.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleNearMeCheck}
                        disabled={nearbyStatus === 'loading' || !eprtrDataset}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#14212b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#203140] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {nearbyStatus === 'loading' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MapPin className="h-4 w-4 text-[#ff7a18]" />
                        )}
                        {nearbyStatus === 'loading' ? 'Checking location' : 'Check around my room'}
                      </button>
                    </div>

                    {nearbyStatus === 'error' && (
                      <div className="mt-5 rounded-lg border border-[#f05a9d]/30 bg-[#fff0f7] p-4 text-sm font-medium text-[#9d2862]">
                        {nearbyError}
                      </div>
                    )}

                    {nearbyResult && (
                      <div className="mt-5 grid gap-4 lg:grid-cols-2">
                        <div className="rounded-lg border border-[#d9e2e8] bg-[#f8fafb] p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Factory className="h-5 w-5 text-[#25a9e0]" />
                            <p className="text-sm font-black text-[#14212b]">Nearby E-PRTR factories</p>
                          </div>
                          <p className="mb-4 text-xs leading-5 text-[#526371]">
                            Location: {nearbyResult.lat.toFixed(4)}, {nearbyResult.lon.toFixed(4)}. Showing raw CSV facilities within 50 km.
                          </p>
                          {nearbyResult.factories.length ? (
                            <div className="space-y-3">
                              {nearbyResult.factories.map((factory) => (
                                <div key={`${factory.id}-${factory.lat}-${factory.lon}`} className="rounded-lg bg-white p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-black text-[#14212b]">{factory.name}</p>
                                      <p className="mt-1 text-xs leading-5 text-[#526371]">
                                        {factory.city}, {factory.country} · {factory.sectorName}
                                      </p>
                                    </div>
                                    <span className="shrink-0 rounded-lg bg-[#eef9fd] px-2 py-1 text-xs font-black text-[#168fca]">
                                      {factory.distanceKm.toFixed(1)} km
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-lg bg-white p-3 text-sm text-[#526371]">
                              No raw E-PRTR facility coordinates were found within 50 km.
                            </p>
                          )}
                        </div>

                        <div className="rounded-lg border border-[#d9e2e8] bg-[#f8fafb] p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-[#f3703d]" />
                            <p className="text-sm font-black text-[#14212b]">Naturvårdsverket signal</p>
                          </div>
                          <p className="mb-4 text-xs leading-5 text-[#526371]">{nearbyResult.protectedAreaNote}</p>
                          {nearbyResult.protectedAreas.length ? (
                            <div className="space-y-3">
                              {nearbyResult.protectedAreas.map((area) => (
                                <div key={`${area.id}-${area.distanceKm}`} className="rounded-lg bg-white p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-black text-[#14212b]">{area.name}</p>
                                      <p className="mt-1 text-xs leading-5 text-[#526371]">{area.type}</p>
                                    </div>
                                    <span className="shrink-0 rounded-lg bg-[#fff4ec] px-2 py-1 text-xs font-black text-[#d9571f]">
                                      {area.distanceKm === 0 ? 'Inside' : `${area.distanceKm.toFixed(1)} km`}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-lg bg-white p-3 text-sm text-[#526371]">
                              No protected-area matches are available for this browser location.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.section>
          </div>
        )}

      </div>
    </div>
  );
}
