from pathlib import Path
import json,hashlib,subprocess
root=Path.cwd();out=root/'tmp/audit-input';manifest=[]
def clean(v):
 if isinstance(v,dict):return{k:clean(x)for k,x in v.items()if k!='note'}
 if isinstance(v,list):return[clean(x)for x in v]
 return v

def leaves(v,path):
 if isinstance(v,(str,int,float,bool)):return[(path,v)]
 if isinstance(v,list):return[p for i,x in enumerate(v)for p in leaves(x,f'{path}[{i}]')]
 if isinstance(v,dict):return[p for k,x in v.items()for p in leaves(x,f'{path}.{k}')]
 return[]

def get(d,p):
 x=d
 for k in p.split('.'):x=x.get(k)if isinstance(x,dict)else None
 return x

for kind in ['states','national']:
 for file in sorted((root/'data'/kind).glob('*.json')):
  d=clean(json.loads(file.read_text()));key=file.stem;records=[];counter=0
  def add(path,item,keys,surface):
   global counter
   if item is None:return
   fields=[]
   for k in keys:
    if k not in item:continue
    for at,v in leaves(item[k],path+'.'+k):
     counter+=1;fields.append(dict(fieldId=f'{key}:F{counter:05d}',path=at,value=v,surface=surface))
   if fields:records.append(dict(itemId=item.get('id',path),recordPath=path,sourcePages=item.get('sourcePages',[]),seats=item.get('seats'),context={k:v for k,v in item.items()if k in ['condition','effect','appliesWhen','requiresManualCheck','allows','stage','sector','seats']},fields=fields))
  def array(path,keys,surface):
   for i,x in enumerate(get(d,path)or[]):add(f'{path}[{i}]',x,keys,surface)
  add('meta',d['meta'],['state','year','authority','officialWebsites','coursesCovered','seatTerms']if kind=='states'else['title','shortTitle','authority','scope','courses','tentative','documentDate','documentDateLabel','officialWebsites'],'header/home')
  if kind=='states':
   add('eligibility.listedHomeInstitutions',d['eligibility']['listedHomeInstitutions'],['names'],'profile institution options')
   add('eligibility.inServiceLabel',d['eligibility']['inServiceLabel'],['label'],'profile service question')
   add('eligibility.quotaTerms',d['eligibility'].get('quotaTerms'),['terms'],'conditional quota explanation')
   add('eligibility.manualReview',d['eligibility'].get('manualReview'),['title','detail'],'manual eligibility summary')
   array('process',['title','description','link'],'steps')
   array('eligibility.rules',['title','explanation'],'eligibility')
   add('reservation.policy',d['reservation']['policy'],['appliesTo','vertical','horizontal'],'reservation table/bar')
   add('reservation.conversion',d['reservation']['conversion'],['when','steps'],'conversion list')
   array('reservation.rules',['title','detail'],'reservation cards')
   # The base fee is hidden when calculationNote is used; options are shown separately.
   if not d['fees'].get('calculationNote'):add('fees.registration',d['fees']['registration'],['amountInr','covers','refundable'],'registration/upfront summary')
   add('fees.calculationNote',d['fees'].get('calculationNote'),['title','detail'],'fee summary')
   array('fees.registrationOptions',['amountInr','covers','refundable'],'application/registration fee rows')
   array('fees.securityDeposits',['label','amountInr'],'deposit rows/recommendation')
   for section in ['fees.rules','choiceFilling','rounds','admission','resignation.rules','serviceBond.rules']:array(section,['title','detail','tag'],section+' cards')
   array('documents',['name','detail'],'conditional checklist')
   array('resignation.ladder',['stage','window','securityDeposit','fees','otherConsequence'],'resignation ladder')
   add('serviceBond.bond',d['serviceBond']['bond'],['appliesTo','durationYears','amounts','placeOfService'],'bond summary')
   add('helpdesk',d['helpdesk'],['phones','emails','hours','instructions'],'help desk')
   array('helpCentres',['name','address'],'help-centre list')
   array('nodalCentres',['centre','privateMedical','privateDental'],'college/centre list')
   array('disabilityCentres',['name','location','remarks'],'disability boards')
   array('annexures',['title','description'],'forms/annexures expandable')
   array('importantDates',['label','date','endDate','endTime','detail'],'important dates/summary/deadline')
   array('gaps',['title','detail'],'gap cards')
  else:
   array('rounds',['name','stages'],'round timeline (including expandable college stages)')
   array('milestones',['label','date'],'academic session')
   array('notes',['title','detail'],'schedule notes')
   array('gaps',['title','detail'],'schedule gaps')
  # Source-document names and printed date provenance are also displayed.
  for i,x in enumerate(d['source'].get('documents',[])):
   item={**x,'id':f'provenance-document-{i+1}','sourcePages':[x['startPage']]}
   add(f'source.documents[{i}]',item,['title','url','issued'],'source document list')
  textdir=out/key/'text';textdir.mkdir(parents=True,exist_ok=True)
  pdf=root/d['source']['dir']/'source.pdf'
  txt=subprocess.check_output(['pdftotext','-layout',str(pdf),'-'],text=True)
  pages=txt.split('\f')
  if pages and not pages[-1].strip():pages.pop()
  for i,txt in enumerate(pages,1):(textdir/f'p-{i:03d}.txt').write_text(txt)
  payload={'key':key,'kind':kind,'snapshot':'b824b5d5b444ec870e173f37aba8b1c53a6b179b','dataSha256':hashlib.sha256(file.read_bytes()).hexdigest(),'source':d['source'],'records':records,'fieldCount':counter,'derivedSurfaces':['eligibility headlines/reasons/categories/quota/sector/courses and document applicability','deposit recommendation and upfront total','reservation complement and horizontal/vertical labels','counts of checklist/centres/rows','next deadline, stage status and IST urgency/countdown']if kind=='states'else['next deadline and stage status','IST urgency/countdown','schedule course-warning and source date label']}
  (out/f'{key}-visible.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
  manifest.append({'key':key,'kind':kind,'records':len(records),'displayFields':counter,'sourcePages':d['source']['pageCount'],'sourceDir':d['source']['dir'],'inventory':str(out/f'{key}-visible.json')})
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(out/'intake.json').write_text(json.dumps({'owner':'01a11ffa-4cd5-76d2-aebe-171d114e9a1f','canonicalRepo':'/Users/maheenejaz/Developer/neet-pg-brochure','ownedWorktree':str(root),'branch':'codex/audit-rendered-facts','HEAD':'b824b5d5b444ec870e173f37aba8b1c53a6b179b','fetchedDefault':'b824b5d5b444ec870e173f37aba8b1c53a6b179b','fetchedAtUTC':'2026-10-09T12:30:53Z','scope':'All five integrated state guides +MCC, only factual content exposed in app; separately reconcile97 email uncertainties.'},indent=2)+'\n')
print(json.dumps(manifest,indent=2))
