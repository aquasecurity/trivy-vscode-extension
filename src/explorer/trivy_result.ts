
export class TrivyResult {

	public extraData: Vulnerability | Misconfiguration;
	constructor(public id: string,
		public title: string,
		public description: string,
		public filename: string,
		public startLine: number,
		public endLine: number,
		public severity: string,
		public references: string[],
		extra: Vulnerability | Misconfiguration) {
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

const processResult = (result: any): TrivyResult[] => {

	var results: TrivyResult[] = [];

	if (result.Misconfigurations) {
		for (let i = 0; i < result.Misconfigurations.length; i++) {
			const element = result.Misconfigurations[i];

			let startLine = 1;
			let endLine = 1;

			if (element.IacMetadata !== null) {
				startLine = element.IacMetadata.StartLine ? element.IacMetadata.StartLine : 1;
				endLine = element.IacMetadata.EndLine ? element.IacMetadata.EndLine : 1;
			};

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
	return results;
};

export { processResult };
