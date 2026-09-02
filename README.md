<h1>URBALY</h1>

> **Sistema de Monitoramento Colaborativo e Análise de Dados Urbanos no Município de Macapá**

## Sobre

**URBALY** é uma plataforma colaborativa voltada ao monitoramento, mapeamento e análise de ocorrências e infraestrutura urbana na cidade de Macapá-AP. O sistema permite que cidadãos reportem eventos adversos — como buracos nas vias, pontos de descarte irregular de resíduos, semáforos defeituosos e vias bloqueadas — centralizando esses dados para consulta pública, análises espaciais e suporte à tomada de decisões da gestão pública e da comunidade.

Trabalho desenvolvido como requisito avaliativo do curso de **Bacharelado em Engenharia de Computação** da **Faculdade de Tecnologia do Amapá (META)**.


## Problema

Em Macapá, os problemas de infraestrutura de zeladoria urbana impactam diariamente o cidadão. A falta de informações centralizadas e a baixa fluidez dos canais formais de ouvidoria dificultam o acompanhamento da resolução dos problemas.

O **URBALY** propõe solucionar essas falhas através de:
- **Centralização:** Interface única para coleta de ocorrências com geolocalização e fotos.
- **Transparência e Acessibilidade:** Consulta pública dos dados de forma aberta para cidadãos, entidades e poder público.
- **Eficiência Técnica:** Processamento e armazenamento de alto desempenho para análises geoespaciais em tempo real.

---

## Arquitetura e Tecnologias

### Frontend (Web & Mobile)
- **Framework:** [Next.js](https://nextjs.org/) (React + TypeScript)
- **Estilização:** Tailwind CSS & Shadcn UI
- **Mapeamento:** Leaflet / Mapbox (`react-map-gl`)

### Backend & Banco de Dados
- **API Server:** [Rust](https://www.rust-lang.org/) (Actix-web / Axum)
- **Banco de Dados Geoespacial:** [ClickHouse](https://clickhouse.com/) (Armazenamento e processamento escalável de eventos espaciais)

## Créditos

**Desenvolvedores / Pesquisadores:**
- Gabriel Ataíde de Almeida
- Lucas Paulo de Souza Navegante
- Pedro Henrique Barbosa Pires da Costa

**Orientação / Docência:**
- Prof. Esp. João Bosco

**Instituição:**
- Centro Universitário META — Bacharelado em Engenharia de Computação (2026)

---

## 📄 Licença

Este projeto está licenciado sob a Licença **MIT** - consulte o arquivo [LICENSE](LICENSE) para obter mais detalhes.
