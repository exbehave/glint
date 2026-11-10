# More gunshot options (Kennedy, Nov 9, 18:59: crystal burst picked for the shatter; choose another gunshot).
# Run from this folder: python3 shots2.py -> shot-d..h.m4a and each with the crystal burst (shotx-*.m4a)
import numpy as np, subprocess, scipy.signal as sg, scipy.io.wavfile as wf, os
SR=48000; rng=np.random.default_rng(23)
src=open('synth.py').read(); src=src[:src.index("save('shot-a'")]
exec(src.split('\n',2)[2] if src.startswith('import') else src)  # t, lp, hp, bp, pad, at, verb, shot, click, cock, save
rng=np.random.default_rng(23)
def hand_cannon(): return shot(boomf=(90,28),btau=.3,tail=.9,wet=.4)
def silenced():
    y=np.zeros(int(.8*SR)); n=t(.12)
    at(y,bp(rng.standard_normal(len(n)),600,4000)*np.exp(-n/.018)*1.0,0)
    f=900*np.exp(-n/.04)+180; at(y,np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-n/.03)*.7,0)
    at(y,hp(rng.standard_normal(int(.004*SR)),3000)*.5,0)
    n=t(.25); at(y,bp(rng.standard_normal(len(n)),2500,7000)*np.exp(-n/.05)*.12,.03)  # the slide
    return verb(y,.4,.2)
def western():
    y=shot(btau=.1,tail=.3,wet=.15); out=np.zeros(len(y)+int(2.2*SR)); out[:len(y)]+=y
    for d,a in [(.38,.45),(.8,.28),(1.3,.16),(1.85,.09)]: at(out,lp(y[:int(.5*SR)],1800-d*400)*a,d)
    return out
def cap_gun():
    y=np.zeros(int(.6*SR)); n=t(.05)
    at(y,hp(rng.standard_normal(len(n)),2500)*np.exp(-n/.008)*1.0,0)
    at(y,np.sin(2*np.pi*1800*n)*np.exp(-n/.01)*.4,0)
    return verb(y,.35,.25,7000)
def shotgun():
    y=shot(boomf=(140,40),btau=.18,tail=.7,wet=.35)
    for k in range(6): at(y,lp(rng.standard_normal(int(.03*SR)),4000)*np.exp(-t(.03)/.008)*.35,.004+k*.003)  # spread
    pump=np.zeros(int(1.0*SR)); at(pump,click(1800,600,.01,.05)*.6,.0); at(pump,click(2400,900,.008,.04)*.7,.22)
    out=np.zeros(len(y)+int(.2*SR)); out[:len(y)]+=y; at(out,pump*.8,1.0); return out
def norm(y): return y/np.max(np.abs(y))*.95
def save2(name,y):
    wf.write(name+'.wav',SR,(norm(y)*32767).astype(np.int16))
    subprocess.run(['ffmpeg','-v','error','-y','-i',name+'.wav','-af','silenceremove=stop_periods=-1:stop_threshold=-60dB:stop_duration=0.3,volume=-1dB','-ar','48000','-ac','1','-c:a','aac','-b:a','128k',name+'.m4a'],check=True)
_,cr=wf.read('shatter-a.wav'); cr=cr.astype(float)/32767
for k,f in [('d',hand_cannon),('e',silenced),('f',western),('g',cap_gun),('h',shotgun)]:
    y=norm(f()); save2('shot-'+k,y)
for k in 'abcdefgh':
    _,s=wf.read('shot-'+k+'.wav') if os.path.exists('shot-'+k+'.wav') else (None,None)
    if s is None: subprocess.run(['ffmpeg','-v','error','-y','-i','shot-'+k+'.m4a','-ar','48000','-ac','1','shot-'+k+'.wav'],check=True); _,s=wf.read('shot-'+k+'.wav')
    s=s.astype(float)/32767; mix=np.zeros(max(len(s),int(.05*SR)+len(cr))+SR//4); mix[:len(s)]+=s; at(mix,cr*.8,.05); save2('shotx-'+k,mix)
