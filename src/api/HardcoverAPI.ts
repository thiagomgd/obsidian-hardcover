import * as https from "https";
import { PluginSettings } from "../../main";

export class HardcoverAPI {
	private settings: PluginSettings;

	constructor(settings: PluginSettings) {
		this.settings = settings;
	}

	// Update settings if they change
	updateSettings(settings: PluginSettings) {
		this.settings = settings;
	}

	async makeRequest(
		options: https.RequestOptions,
		data?: string
	): Promise<any> {
		return new Promise((resolve, reject) => {
			const req = https.request(options, (res) => {
				let responseData = "";

				res.on("data", (chunk) => {
					responseData += chunk;
				});

				res.on("end", () => {
					try {
						if (
							res.statusCode &&
							res.statusCode >= 200 &&
							res.statusCode < 300
						) {
							const jsonResponse = JSON.parse(responseData);
							resolve(jsonResponse);
						} else {
							reject(
								new Error(
									`API request failed with status ${res.statusCode}`
								)
							);
						}
					} catch (error) {
						reject(
							new Error(
								`Failed to parse API response: ${error.message}`
							)
						);
					}
				});
			});

			req.on("error", (error) => {
				reject(new Error(`Network error: ${error.message}`));
			});

			if (data) {
				req.write(data);
			}

			req.end();
		});
	}

	async graphqlRequest(query: string, variables?: any): Promise<any> {
		const data = JSON.stringify({
			query,
			variables,
		});

		const options = {
			hostname: "api.hardcover.app",
			path: "/v1/graphql",
			method: "POST",
			headers: {
				Authorization: `${this.settings.apiKey}`,
				"Content-Type": "application/json",
				"Content-Length": data.length,
			},
		};

		const response = await this.makeRequest(options, data);

		if (response.errors && response.errors.length > 0) {
			throw new Error(`GraphQL Error: ${response.errors[0].message}`);
		}

		return response.data;
	}

	async fetchData(): Promise<any[]> {
		const query = `
            query Test {
				me {
					username
				}
			}
        `;

		const data = await this.graphqlRequest(query);
		console.log("-->", { data });
		return data.items;
	}
}
