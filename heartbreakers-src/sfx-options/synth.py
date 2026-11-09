import numpy as np, subprocess, scipy.signal as sg, scipy.io.wavfile as wf
SR=48000; rng=np.random.default_rng(7)
def t(n): return np.arange(int(n*SR))/SR
def lp(x,f,o=2): b,a=sg.butter(o,f/(SR/2)); return sg.lfilter(b,a,x)
def hp(x,f,o=2): b,a=sg.butter(o,f/(SR/2),'high'); return sg.lfilter(b,a,x)
def bp(x,f1,f2,o=2): b,a=sg.butter(o,[f1/(SR/2),f2/(SR/2)],'band'); return sg.lfilter(b,a,x)
def pad(x,n): y=np.zeros(int(n*SR)); y[:len(x)]=x[:len(y)]; return y
def at(dst,x,sec): i=int(sec*SR); dst[i:i+len(x)]+=x[:len(dst)-i]
def verb(x,rt,wet,lpf=4000):
    n=int(rt*1.3*SR); tt=np.arange(n)/SR; ir=rng.standard_normal(n)*np.exp(-6.9*tt/rt); ir=lp(ir,lpf); ir[:int(.012*SR)]=0
    y=sg.fftconvolve(x,ir)[:len(x)+n]; y/=np.max(np.abs(y))+1e-9; out=pad(x,len(y)/SR); return out+wet*y*np.max(np.abs(x))
def shot(boomf=(120,45),btau=.12,tail=.5,wet=.35,slap=None,whine=False):
    L=2.6; y=np.zeros(int(L*SR))
    cr=hp(rng.standard_normal(int(.005*SR)),1500)*np.linspace(1,0,int(.005*SR))**.5; at(y,cr*1.0,0)
    n=t(.25); body=lp(rng.standard_normal(len(n)),3500)*np.exp(-n/.028); at(y,body*1.4,0)
    n=t(.9); f=boomf[1]+(boomf[0]-boomf[1])*np.exp(-n/.05); ph=2*np.pi*np.cumsum(f)/SR
    boom=np.tanh(2.5*np.sin(ph)*np.exp(-n/btau)); at(y,boom*.9,.001)
    n=t(tail*3); tl=lp(rng.standard_normal(len(n)),1400)*np.exp(-n/tail); at(y,tl*.22,.01)
    if slap: 
        for d,a in slap: seg=y[:int(.4*SR)].copy()*np.hanning(int(.8*SR))[int(.4*SR):]; at(y,lp(seg,2000)*a,d)
    if whine:
        n=t(.7); f=3300-1700*n/.7+90*np.sin(2*np.pi*11*n); w=np.sin(2*np.pi*np.cumsum(f)/SR)*np.sin(np.pi*n/.7)**1.5*np.exp(-n/.5); at(y,w*.18,.09)
    y=verb(y,1.0+tail,wet)
    return y
def click(f1,f2,tau,nl,amp=1):
    n=t(.08); c=bp(rng.standard_normal(len(n)),3000,9000)*np.exp(-n/.0015)*nl
    c+=np.sin(2*np.pi*f1*n)*np.exp(-n/tau)*.6+np.sin(2*np.pi*f2*n)*np.exp(-n/(tau*.6))*.4
    return c*amp
def cock(stages):
    y=np.zeros(int(.6*SR))
    for d,f1,f2,tau,nl,a in stages: at(y,click(f1,f2,tau,nl,a),d)
    th=np.sin(2*np.pi*260*t(.05))*np.exp(-t(.05)/.01); at(y,th*.5,stages[-1][0])
    return verb(y,.35,.25,6000)
def save(name,y):
    y=y/np.max(np.abs(y))*.95; wf.write(name+'.wav',SR,(y*32767).astype(np.int16))
    pk = '-1' if name.startswith('shot') else '-5'   # peak-leveled: a gunshot's loudness is its crack, not its tail
    subprocess.run(['ffmpeg','-v','error','-y','-i',name+'.wav','-af',f'silenceremove=stop_periods=-1:stop_threshold=-60dB:stop_duration=0.3,volume={pk}dB','-ar','48000','-ac','1','-c:a','aac','-b:a','128k',name+'.m4a'],check=True)
save('shot-a',shot(btau=.1,tail=.35,wet=.25))
save('shot-b',shot(boomf=(100,34),btau=.2,tail=.8,wet=.5,slap=[(.28,.35),(.55,.15)]))
save('shot-c',shot(btau=.12,tail=.5,wet=.35,whine=True))
save('cock-a',cock([(0,2800,1900,.008,1,.8),(.09,1600,3400,.015,1.3,1)]))
save('cock-b',cock([(0,3100,2200,.006,.8,.6),(.05,2600,1800,.008,1,.7),(.12,1500,3200,.016,1.4,1)]))
