export function firstLetterLowerCase(string: string): string {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

export function firstLetterUpperCase(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function format(text: string, args: object): string {
  Object.entries(args).forEach((data) => {
    let reg = new RegExp(data[0], 'g');
    text = text.replace(reg, data[1]);
  });

  return text;
}

export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function toClass(string: string): string {
  return capitalizeFirstLetter(toCamel(string));
}

export function toCamel(string: string): string {
  return firstLetterLowerCase(
    string.replace(/([\_\-]\w)/g, (m) => m[1].toUpperCase())
  );
}

export function toKebab(string: string): string {
  return toSnake(string).replace(/[\_\-]/g, '-').toLowerCase();
}

export function toSnake(string: string): string {
    return string
      // Add underscore between lower and upper letters
      .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, '$1_$2')
      // Add underscore between lower and number
      .replace(/([\p{Ll}0-9])(\p{Lu})/gu, '$1_$2')
      // Remove dash before numbers
      .replace(/-(\d)/g, '$1')
      .toLowerCase();
}

export function toScreamingSnake(string: string): string {
  return toKebab(string).replace(/-/g, '_').toUpperCase();
}

export function pathToTagName(string: string): string {
  return string.split('/').join('-').toLowerCase();
}

export function buildStringIdentifier(inputString: string): string {
  // First replace any character that is not a letter, number, or dash with a dash,
  // then replace multiple dashes with a single dash,
  // and finally trim leading or trailing dashes.
  inputString = inputString
    .replace(/[^a-zA-Z0-9-]/g, '-')

  inputString = toKebab(inputString)

  return inputString.replace(/-+/g, '-')
    .replace(/^[-]+|[-]+$/g, '');
}
