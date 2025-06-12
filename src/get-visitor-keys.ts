export function getVisitorKeys(node: any): string[] {
	if (!node || typeof node !== 'object') return [];
	return Object.keys(node).filter((key) => {
		const value = node[key];
		return (
			(typeof value === 'object' &&
				value !== null &&
				key !== 'position' && // skip position metadata
				key !== 'type' && // skip node type itself
				!Array.isArray(value)) ||
			(value.length > 0 && typeof value[0] === 'object')
		);
	});
}
