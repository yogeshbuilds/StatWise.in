// Creates the starting categories (docs/categories.md). Safe to re-run: existing ones are left untouched.
// Run: npx sanity exec scripts/seed-categories.ts --with-user-token
import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-02-19'})

const categories: [string, string, string][] = [
  ['Economy', 'economy', 'GDP, growth and the overall health of India’s economy.'],
  ['Prices & Inflation', 'prices-inflation', 'Consumer and wholesale prices, food and fuel costs.'],
  ['Jobs & Labour', 'jobs-labour', 'Employment, unemployment, wages and the workforce.'],
  ['Agriculture & Food', 'agriculture-food', 'Crops, farm incomes, irrigation and food security.'],
  ['Health', 'health', 'Health outcomes, nutrition, hospitals and disease burden.'],
  ['Education', 'education', 'Schools, colleges, literacy and learning outcomes.'],
  ['Population & Society', 'population-society', 'Census, births and deaths, migration, gender and cities.'],
  ['Government & Budget', 'government-budget', 'Union and state budgets, taxes, schemes and public debt.'],
  ['Banking & Money', 'banking-money', 'RBI data, credit, deposits, digital payments and markets.'],
  ['Trade & Industry', 'trade-industry', 'Exports, imports, manufacturing and industrial output.'],
  ['Energy & Environment', 'energy-environment', 'Power, renewables, emissions, air quality and forests.'],
  ['Infrastructure & Transport', 'infrastructure-transport', 'Roads, railways, aviation and housing.'],
  ['Crime & Justice', 'crime-justice', 'Crime statistics, courts, case pendency and policing.'],
  ['Elections & Politics', 'elections-politics', 'Election results, turnout and representation.'],
  ['Technology & Digital', 'technology-digital', 'Internet, telecom, digital public infrastructure and startups.'],
  ['States & Cities', 'states-cities', 'How India’s states, districts and cities compare.'],
]

const tx = client.transaction()
categories.forEach(([name, slug, description], i) => {
  tx.createIfNotExists({
    _id: `category-${slug}`,
    _type: 'category',
    name,
    slug: {_type: 'slug', current: slug},
    description,
    order: (i + 1) * 10,
  })
})

const result = await tx.commit()
console.log(`Done. ${result.results.length} categories ensured.`)
