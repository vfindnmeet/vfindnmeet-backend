const f = (fieldsMap: any) => {
  const fields: any[] = [];
  const values:any[] = [];

  Object.keys(fieldsMap).forEach(field => {
    fields.push(field);
    values.push(fieldsMap[field]);
  });

  return { fields, values };
};

export default class QueryBuilder {
  static update(table: string, fieldsToUpdate: any, where: any) {
    const { fields, values } = f(fieldsToUpdate);
    const whereFields = f(where);

    const query = `
      UPDATE ${table}
      SET ${fields.map((field, ix) => `${field} = $${ix + 1}`).join(', ')}
      WHERE ${whereFields.fields.map((field, ix) => `${field} = $${fields.length + ix + 1}`).join(' AND ')}
    `;

    return {
      query,
      values: [...values, ...whereFields.values]
    };
  }
}
