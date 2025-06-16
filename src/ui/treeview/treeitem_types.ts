/**
 * Enum for the different types of tree items in the Trivy tree view.
 * @enum {number}
 */
export enum TrivyTreeItemType {
  misconfigCode = 0,
  misconfigInstance = 1,
  vulnerablePackage = 2,
  vulnerabilityCode = 3,
  misconfigFile = 4,
  vulnerabilityFile = 5,
  secretFile = 6,
  secretInstance = 7,
  secretCode = 8,
  workspace = 9,
  assurancePolicy = 10,
  assuranceControl = 11,
  assuranceControlResult = 12,
  multiCodeAssurancePolicy = 13,
  singleCodeAssurancePolicy = 14,
  vulnerabilityRoot = 15,
  misconfigRoot = 16,
  secretRoot = 17,
  vulnerabilitySeverity = 18,
  misconfigSeverity = 19,
  secretSeverity = 20,
  sastRoot = 21,
  sastSeverity = 22,
  sastCode = 23,
  sastFile = 24,
  unknown = 25,
}
