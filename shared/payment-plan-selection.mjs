// View-only month selection shared by the screen and both download formats.
// "none" records an intentionally empty selection; a missing value uses the
// existing single-month route, then the current month in the selected year.
export function selectedPaymentMonths(query={},asOf=''){
 const year=String(query.year??String(asOf).slice(0,4));
 if(!/^\d{4}$/.test(year)||Number(year)<1900)throw Error('Choose a valid planning year.');
 const valid=month=>typeof month==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(month)&&month.slice(0,4)===year;
 const explicit=query.months;
 if(explicit!=null&&typeof explicit!=='string')throw Error('Choose valid months within the selected year.');
 const value=explicit?.trim()||'';
 if(value==='none')return [];
 if(value){
  const months=value.split(',').map(month=>month.trim());
  if(months.some(month=>!valid(month)))throw Error('Choose valid months within the selected year.');
  const unique=[...new Set(months)].sort();
  if(unique.length>12)throw Error('Choose no more than 12 months.');
  return unique;
 }
 if(valid(query.month))return [query.month];
 const current=String(asOf).slice(0,7);
 return [valid(current)?current:year+'-01'];
}
