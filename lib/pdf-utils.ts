export async function pdfToImages(file: File): Promise<{ base64: string; mimeType: string }[]> {
    const pdfjsModule = await import('pdfjs-dist');
    pdfjsModule.GlobalWorkerOptions.workerSrc =
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsModule.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsModule.getDocument({ data: arrayBuffer }).promise;
    const images: { base64: string; mimeType: string }[] = [];

    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 8); pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport, canvas } as any).promise;
        images.push({
            base64: canvas.toDataURL('image/jpeg', 0.92).split(',')[1],
            mimeType: 'image/jpeg',
        });
    }
    return images;
}

export async function imageFileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve({ base64: dataUrl.split(',')[1], mimeType: file.type || 'image/jpeg' });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
