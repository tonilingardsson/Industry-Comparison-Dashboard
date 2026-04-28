import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ChevronDown, Download, Factory, FileText, MapPin, Save, TrendingUp } from 'lucide-react';
import { AccountGate } from './components/AccountGate';
import { IndustrySelector } from './components/IndustrySelector';
import { ComparisonCard } from './components/ComparisonCard';
import { EmissionsChart } from './components/EmissionsChart';
import { FacilitiesComparison } from './components/FacilitiesComparison';
import { GeographicSpread } from './components/GeographicSpread';
import brandLogo from '../assets/branding/icons-of-colorful.png';
import brandPhoto from '../assets/branding/logo-with-image.jpg';

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

interface MetricData {
  valuesByYear: Map<number, number>;
  facilityIds: Set<string>;
  locationCandidates: Array<FacilityLocation & { amount: number }>;
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
    country: row.countryName,
    lat: latitude,
    lon: longitude,
    amount,
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

  return { industries, categories, categoriesById: sortedCategoriesById };
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

  return {
    emissionsData,
    facilities,
    locations1,
    locations2,
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

export default function App() {
  const [eprtrDataset, setEprtrDataset] = useState<EprtrDataset | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [industry1, setIndustry1] = useState('');
  const [industry2, setIndustry2] = useState('');
  const [pollutionCategory, setPollutionCategory] = useState('');
  const [pollutionMetric, setPollutionMetric] = useState('');
  const [comparison, setComparison] = useState<ActiveComparison | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

  useEffect(() => {
    if (!categoryOptions.length) {
      setPollutionCategory('');
      return;
    }

    if (!categoryOptions.some((category) => category.id === pollutionCategory)) {
      setPollutionCategory(categoryOptions[0].id);
    }
  }, [categoryOptions, pollutionCategory]);

  useEffect(() => {
    if (!metricOptions.length) {
      setPollutionMetric('');
      return;
    }

    if (!metricOptions.includes(pollutionMetric)) {
      setPollutionMetric(metricOptions[0]);
    }
  }, [metricOptions, pollutionMetric]);

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

  const handleLogin = (email: string) => {
    window.localStorage.setItem(accountStorageKey, JSON.stringify({ email }));
    setUserEmail(email);
  };

  const handleLogout = () => {
    window.localStorage.removeItem(accountStorageKey);
    setUserEmail(null);
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
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white shadow-lg shadow-black/15">
              <span className="text-3xl font-black leading-none text-[#f3703d]">Of</span>
            </div>
            <img src={brandLogo} alt="Icons Of" className="h-9 w-auto max-w-[180px] object-contain" />
          </div>
          <div className="hidden rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur sm:block">
            European open data prototype
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 max-w-4xl"
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-[#ff7a18]" />
            Industry emissions comparison
          </div>
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
                    onChange={(event) => setPollutionCategory(event.target.value)}
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
                <p className="text-xs leading-5 text-[#526371]">
                  {selectedCategory?.description}
                </p>
              </div>
              <IndustrySelector
                label={selectedCategory?.metricLabel ?? 'Metric'}
                value={pollutionMetric}
                onChange={setPollutionMetric}
                industries={metricOptions}
                color="border-[#14212b]/20 focus:border-[#14212b] focus:ring-[#14212b]"
                placeholder="Select metric..."
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
                  <h3 className="text-xl font-black text-[#14212b]">Detailed Benchmark Report</h3>
                  <p className="text-sm text-[#526371]">Optional account unlock for deeper analysis.</p>
                </div>
              </div>

              <AccountGate userEmail={userEmail} onLogin={handleLogin} onLogout={handleLogout} />

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
                      <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f3703d] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#ff7a18]">
                        <Download className="h-4 w-4" />
                        Export report
                      </button>
                      <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#14212b]/15 bg-white px-4 py-3 text-sm font-bold text-[#14212b] transition hover:border-[#14212b]/30">
                        <Save className="h-4 w-4" />
                        Save comparison
                      </button>
                    </div>
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
