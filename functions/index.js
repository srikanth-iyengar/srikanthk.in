import welcome from "welcome.html";

/**
 * @typedef {Object} Env
 */

export default {
	/**
	 * @param {Request} request
	 * @param {Env} env
	 * @param {ExecutionContext} ctx
	 * @returns {Promise<Response>}
	 */
	async fetch(request, env, ctx) {
		const getResponseType = (code, validCodes) => {
			if (validCodes && String(validCodes).includes(String(code))) return true;
			if (Number.isNaN(code)) return false;
			const numericCode = parseInt(code, 10);
			return (numericCode >= 200 && numericCode <= 302);
		  };
		const makeMessageText = (data) => `${data.successStatus ? '✅' : '⚠️'} `
		  + `${data.serverName || 'Server'} responded with `
		  + `${data.statusCode} - ${data.statusText}. `
		  + `\n⏱️Took ${data.timeTaken} ms`;

		const makeErrorMessage = (data) => `❌ Service Unavailable: ${data.hostname || 'Server'} `
		  + `resulted in ${data.code || 'a fatal error'} ${data.errno ? `(${data.errno})` : ''}`;

		const makeErrorMessage2 = (data) => '❌ Service Error - '
		  + `${data.status} - ${data.statusText}`;

		const makeRequest = async (url, options) => {
			const {
				headers, enableInsecure, acceptCodes, maxRedirects,
			} = options;

			const validCodes = acceptCodes && acceptCodes !== 'null' ? acceptCodes : null;
			const startTime = new Date();

			const resp = await fetch(url, {
				headers: headers,
			})
			try {
				const statusCode = resp.status
				const { statusText } = resp;
				const successStatus = getResponseType(statusCode, validCodes)
				const respUrl = new URL(resp.url)
				const serverName = respUrl.hostname
				const timeTaken = (new Date() - startTime)
				const results = {
					statusCode, statusText, serverName, successStatus, timeTaken,
				}
				results.message = makeMessageText(results)
				return results
			}
			catch(error) {
				const response = error ? (error.response || {}) : {};
				const returnCode = response.status || response.code;
				if (validCodes && String(validCodes).includes(returnCode)) { // Success overridden by user
				  const results = {
					successStatus: getResponseType(returnCode, validCodes),
					statusCode: returnCode,
					statusText: response.statusText,
					timeTaken: (new Date() - startTime),
				  };
				  results.message = makeMessageText(results);
				  return results;
				} else { // Request failed
				  return {
					successStatus: false,
					message: error.response ? makeErrorMessage2(error.response) : makeErrorMessage(error),
				  };
				}
			}

		}
		const decodeHeaders = (maybeHeaders) => {
			if (!maybeHeaders) return {};
			const decodedHeaders = decodeURIComponent(maybeHeaders);
			let parsedHeaders = {};
			try {
			  parsedHeaders = JSON.parse(decodedHeaders);
			} catch (e) { /* Not valid JSON, will just return false */ }
			return parsedHeaders;
		  };

		  /* Returned if the URL param is not present or correct */
		  const immediateError = (render) => {
			render(JSON.stringify({
			  successStatus: false,
			  message: '❌ Missing or Malformed URL',
			}));
		  };

		const url = new URL(request.url)
		if(url.pathname=="/status-check/") {
			const params = new URLSearchParams(request.url)
			const acceptCodes = decodeURIComponent(params.get('acceptCodes'));
			const maxRedirects = decodeURIComponent(params.get('maxRedirects')) || 0;
			const headers = decodeHeaders(params.get('headers'));
			const enableInsecure = !!params.get('enableInsecure');
			const options = {
				headers, enableInsecure, acceptCodes, maxRedirects,
			}
			const data = await makeRequest(params.get("url"), options)
			return Response.json(data)
		}
		return Response.json({})
	},
};

