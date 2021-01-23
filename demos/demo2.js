/* globals zip, document, URL, MouseEvent, alert */

(() => {

	zip.configure({
		workerScripts: {
			inflate: ["lib/z-worker-pako.js", "lib/pako_inflate.min.js"]
		}
	});

	const model = (() => {
		let blobReader;
		return {
			getEntries(file, options) {
				blobReader = new zip.BlobReader(file);
				const zipReader = new zip.ZipReader(blobReader);
				return zipReader.getEntries(options);
			},
			async getEntryFile(entry, options) {
				let writer;
				writer = new zip.BlobWriter();
				const blob = await entry.getData(writer, options);
				return URL.createObjectURL(blob);
			}
		};
	})();

	(() => {
		const fileInput = document.getElementById("file-input");
		const encodingInput = document.getElementById("encoding-input");
		const fileInputButton = document.getElementById("file-input-button");
		const unzipProgress = document.createElement("progress");
		let fileList = document.getElementById("file-list");
		fileInputButton.addEventListener("click", () => fileInput.dispatchEvent(new MouseEvent("click")), false);
		let selectedFile;
		fileInput.onchange = async () => {
			try {
				fileInputButton.disabled = true;
				encodingInput.disabled = true;
				selectedFile = fileInput.files[0];
				await loadFiles();
			} catch (error) {
				alert(error);
			} finally {
				fileInputButton.disabled = false;
				fileInput.value = "";
			}
		};
		encodingInput.onchange = async () => {
			try {
				encodingInput.disabled = true;
				fileInputButton.disabled = true;
				await loadFiles(encodingInput.value);
			} catch (error) {
				alert(error);
			} finally {
				fileInputButton.disabled = false;
			}
		};

		async function loadFiles(filenameEncoding) {
			const entries = await model.getEntries(selectedFile, { filenameEncoding });
			emptyList();
			if (entries && entries.length) {
				fileList.classList.remove("empty");
				const languageEncodingFlagSet = Boolean(entries.find(entry => !entry.bitFlag.languageEncodingFlag));
				encodingInput.value = languageEncodingFlagSet ? ("cp437" || filenameEncoding) : "utf-8";
				encodingInput.disabled = !languageEncodingFlagSet;
				entries.forEach(entry => {
					const li = document.createElement("li");
					const anchor = document.createElement("a");
					anchor.textContent = anchor.title = entry.filename;
					anchor.title = `${entry.filename}\n  Last modification date: ${entry.lastModDate.toLocaleString()}\n  Uncompressed size: ${entry.uncompressedSize.toLocaleString()} bytes`;
					if (!entry.directory) {
						anchor.href = "";
						anchor.addEventListener("click", async event => {
							if (!anchor.download) {
								event.preventDefault();
								try {
									await download(entry, li, anchor);
								} catch (error) {
									alert(error);
								}
							}
						}, false);
					}
					li.appendChild(anchor);
					fileList.appendChild(li);
				});
			}
		}

		async function download(entry, li, a) {
			const blobURL = await model.getEntryFile(entry, {
				onprogress: (index, max) => {
					unzipProgress.value = index;
					unzipProgress.max = max;
					li.appendChild(unzipProgress);
				}
			});
			const clickEvent = new MouseEvent("click");
			unzipProgress.remove();
			unzipProgress.value = 0;
			unzipProgress.max = 0;
			a.href = blobURL;
			a.download = entry.filename;
			a.dispatchEvent(clickEvent);
		}

		function emptyList() {
			const newFileList = fileList.cloneNode();
			fileList = fileList.replaceWith(newFileList);
			fileList = newFileList;
		}

	})();

})();
