import { type InterfaceDeclaration, Node, Project } from "ts-morph";

export async function transformSourceText(
	sourceText: string,
	inputFile: string,
): Promise<string> {
	const project = new Project({ useInMemoryFileSystem: true });
	const sourceFile = project.createSourceFile(inputFile, sourceText);

	const interfacesToProcess: InterfaceDeclaration[] =
		sourceFile.getInterfaces();

	// Process interfaces in a loop to handle newly created ones
	for (let i = 0; i < interfacesToProcess.length; i++) {
		const currentInterface = interfacesToProcess[i];
		const parentInterfaceName = currentInterface.getName();

		for (const prop of currentInterface.getProperties()) {
			const propName = prop.getName();
			const typeNode = prop.getTypeNode();

			if (typeNode && Node.isTypeLiteral(typeNode)) {
				const newInterfaceName = `${parentInterfaceName}_properties_${propName}`;

				const newInterface = sourceFile.insertInterface(
					currentInterface.getChildIndex(),
					{
						name: newInterfaceName,
						isExported: true,
						properties: typeNode
							.getMembers()
							.filter(Node.isPropertySignature)
							.map((member) => member.getStructure()),
					},
				);
				// Add the new interface to the end of the processing queue
				interfacesToProcess.push(newInterface);
				// Update the property to reference the new interface
				prop.setType(newInterfaceName);
			}
		}
	}

	return sourceFile.getFullText();
}
