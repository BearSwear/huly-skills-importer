# Industry skill catalogues — research and design notes

These catalogues are community-maintained examples for `huly-skills-importer`. They are research-informed recruiting taxonomies, not official competency frameworks, certifications, legal advice, or exhaustive occupational standards.

## Design principles

- Every file uses the 18 built-in Huly Recruiting category aliases supported by `huly-skills-importer` v0.4.1.
- The catalogues deliberately avoid assigning skills to `Other`. On Huly v0.7.426, low-reference `Other` skills can be treated as cleanup candidates by the Skills Optimizer.
- Standards and framework names are materialized as skills only when practical familiarity with the framework is useful in recruiting.
- Job titles are generally excluded; the files focus on capabilities that can be assigned to individual talents.
- Importing more than one catalogue is expected to produce overlaps. In v0.4.1 every shared normalized title across the bundled broad/industry catalogues uses one canonical title, category and description, so bundled import order does not redefine shared skills.
- `huly-skills-importer catalogues` checks bundled cross-catalogue consistency, while `merge` rejects conflicting definitions in arbitrary input catalogues.
- Sector regulation varies by country. Adapt legal/regulatory skills to the jurisdictions in which you recruit.


## Bundled consistency in v0.4.1

The broad catalogue and 11 industry files contain intentional overlap because capabilities such as risk management, project management, security testing and client relationship management are transferable across sectors.

v0.4.1 canonicalizes shared definitions across the bundle. A repeated normalized skill name must have the same title/casing, Huly category, description and optional explicit color everywhere it appears. This removes the import-order ambiguity present in v0.4.0.

The canonicalization policy prefers the broad catalogue definition when a shared skill appears there. Industry-only overlaps use a sector-neutral shared definition. This does not prevent organizations from maintaining their own alternative catalogue; it only makes the bundled examples internally coherent.

## Research basis by catalogue

### cybersecurity-services-skills.yaml
Primary basis:
- NIST NICE Workforce Framework Resource Center and NICE Framework Components v2.2.0.
- NIST Cybersecurity Framework and common NIST control/risk practice.
- MITRE ATT&CK and widely used defensive/offensive security workflows.
- ISO/IEC 27001 family and common SOC, DFIR, vulnerability-management and security-engineering practice.

### architecture-engineering-construction-skills.yaml
Primary basis:
- buildingSMART Industry Foundation Classes (IFC), BIM Collaboration Format (BCF), and Information Delivery Specification (IDS).
- ISO 19650-style information-management practice and common openBIM workflows.
- Multidisciplinary architecture, civil/structural/building-services engineering, construction management, commissioning and asset-information delivery.

### environmental-water-skills.yaml
Primary basis:
- US EPA Water Infrastructure Sector Workforce and Water/Wastewater Competency Model material.
- ISO 14001 environmental-management systems and ISO 45001 occupational health and safety.
- Water, wastewater, stormwater, environmental assessment, geospatial, asset-management and utility-operations practice.

### accounting-finance-skills.yaml
Primary basis:
- AICPA/CIMA foundational and CGMA competency frameworks.
- IFRS Accounting Standards and IFRS S1/S2 sustainability disclosure standards.
- COSO Internal Control and Enterprise Risk Management frameworks.
- Audit, accounting, FP&A, treasury, tax, reporting, finance-data and finance-transformation practice.

### legal-services-skills.yaml
Primary basis:
- ISO 37301 compliance management.
- Electronic Discovery Reference Model (EDRM) frameworks.
- Legal operations, contract lifecycle, matter/case management, litigation, legal knowledge, legal technology and compliance practice.

### clinical-research-healthtech-skills.yaml
Primary basis:
- ICH E6(R3) Good Clinical Practice.
- CDISC foundational standards including CDASH, SDTM, ADaM, SEND and ODM.
- HL7 FHIR and common health-interoperability terminology and integration practice.
- Clinical operations, data management, pharmacovigilance, health informatics and regulated software quality.

### manufacturing-industrial-skills.yaml
Primary basis:
- ISA-95 / IEC 62264 enterprise-control system integration.
- OPC UA industrial interoperability.
- ISA/IEC 62443 industrial automation and control-system cybersecurity.
- ISO 55001 asset management.
- Lean, Six Sigma, industrial automation, manufacturing quality, maintenance and production-planning practice.

### facilities-property-skills.yaml
Primary basis:
- ISO 41001 facility-management systems.
- IFMA facility-management knowledge domains and competencies.
- ISO 50001 energy management and ISO 55001 asset management.
- Building operations, workplace, real estate, maintenance, energy, safety and facility-technology practice.

### marketing-agency-skills.yaml
Primary basis:
- Google Ads certification/Skillshop subject areas and Google Analytics Academy.
- IAB standards/guidelines covering digital advertising measurement and responsible advertising/data practices.
- Agency strategy, content, performance marketing, creative production, analytics, client service and creative operations.

### public-sector-municipal-skills.yaml
Primary basis:
- OECD Digital Government Policy Framework and digital-government skills work.
- ISO 18091 guidance for applying quality-management principles in local government.
- Public procurement, service design, administrative casework, policy, urban planning, data governance and programme-delivery practice.

### management-consulting-skills.yaml
Primary basis:
- ISO 20700 guidelines for management consultancy services.
- PMI Talent Triangle (Ways of Working, Power Skills, Business Acumen).
- IIBA BABOK knowledge areas.
- Strategy, transformation, business analysis, project/programme management, research, client delivery and professional-services economics.

## Useful primary-source starting points

- NIST NICE: https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-resource-center
- buildingSMART standards: https://www.buildingsmart.org/standards/
- US EPA water workforce: https://www.epa.gov/sustainable-water-infrastructure/water-infrastructure-sector-workforce
- AICPA & CIMA competency resources: https://www.aicpa-cima.com/
- IFRS Foundation: https://www.ifrs.org/
- COSO: https://www.coso.org/
- ISO 37301: https://www.iso.org/standard/75080.html
- EDRM: https://edrm.net/resources/frameworks-and-standards/
- ICH E6(R3): https://www.ich.org/page/efficacy-guidelines
- CDISC standards: https://www.cdisc.org/standards
- HL7 FHIR: https://hl7.org/fhir/
- ISA-95: https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard
- ISA/IEC 62443: https://www.isa.org/
- ISO 41001: https://www.iso.org/standard/68021.html
- IFMA facility management: https://www.ifma.org/about/what-is-fm/
- ISO 50001: https://www.iso.org/iso-50001-energy-management.html
- Google Ads certifications: https://support.google.com/google-ads/answer/9702955
- IAB standards and guidelines: https://www.iab.com/guidelines/
- OECD Digital Government: https://www.oecd.org/en/topics/digital-government.html
- ISO 18091: https://www.iso.org/standard/72808.html
- ISO 20700: https://www.iso.org/standard/63501.html
- PMI Talent Triangle: https://www.pmi.org/certifications/certification-resources/maintain/talent-triangle
- IIBA BABOK: https://www.iiba.org/career-resources/a-business-analysis-professionals-foundation-for-success/babok/
