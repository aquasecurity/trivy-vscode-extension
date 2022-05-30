
export class TrivyResult {

	public extraData: Vulnerability | Misconfiguration | Secret;
	constructor(public id: string,
		public title: string,
		public description: string,
		public filename: string,
		public startLine: number,
		public endLine: number,
		public severity: string,
		public references: string[],
		extra: Vulnerability | Misconfiguration | Secret) {
		this.extraData = extra;
	}
}

export class Vulnerability {
	public pkgName: string;
	public installedVersion: string;
	public fixedVersion: string;
	constructor(vulnerabitlity: any) {
		this.pkgName = vulnerabitlity.PkgName;
		this.installedVersion = vulnerabitlity.InstalledVersion;
		this.fixedVersion = vulnerabitlity.FixedVersion;
	};
}

export class Misconfiguration {
	public message: string;
	public resolution: string;
	public status: string;
	public startline: number = 0;
	public endline: number = 0;
	constructor(misconfiguration: any) {
		this.message = misconfiguration.Message;
		this.resolution = misconfiguration.Resolution;
		this.status = misconfiguration.Status;
	}
}

export class Secret {
	public category: string;
	public match: string;
	constructor(secret: any) {
		this.category = secret.Category;
		this.match = secret.Match;
	}

}

const processResult = (result: any): TrivyResult[] => {

	var results: TrivyResult[] = [];

	if (result.Misconfigurations) {
		for (let i = 0; i < result.Misconfigurations.length; i++) {
			const element = result.Misconfigurations[i];

			let startLine = element.CauseMetadata ? element.CauseMetadata.StartLine : element.IacMetadata ? element.IacMetadata.StartLine : 1;
			let endLine = element.CauseMetadata ? element.CauseMetadata.EndLine : element.IacMetadata ? element.IacMetadata.StartLine : 1;

			startLine = (startLine && startLine > 0) ? startLine : 1;
			endLine = (endLine && endLine > 0) ? endLine : 1;

			const trivyResult = new TrivyResult(element.ID,
				element.Title,
				element.Description,
				result.Target,
				startLine,
				endLine,
				element.Severity,
				element.References, new Misconfiguration(element));
			results.push(trivyResult);
		}
	}

	if (result.Vulnerabilities) {

		for (let i = 0; i < result.Vulnerabilities.length; i++) {
			const element = result.Vulnerabilities[i];

			const trivyResult = new TrivyResult(element.VulnerabilityID,
				element.Title,
				element.Description,
				result.Target,
				1, 1,
				element.Severity,
				element.References, new Vulnerability(element));
			results.push(trivyResult);
		}

	}

	if (result.Secrets) {

		for (let i = 0; i < result.Secrets.length; i++) {
			const element = result.Secrets[i];

			const trivyResult = new TrivyResult(element.RuleID,
				element.Title,
				element.Description,
				result.Target,
				element.StartLine, 
				element.EndLine,
				element.Severity,
				element.References, new Secret(element));
			results.push(trivyResult);
		}

	}

	return results;
};

export { processResult };
