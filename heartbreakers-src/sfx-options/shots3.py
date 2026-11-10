# Bigger gunshots (Kennedy, Nov 9, 19:02: "anything bigger?"). Run from this folder -> shot-i..l.m4a
import numpy as np, subprocess, scipy.signal as sg, scipy.io.wavfile as wf
SR=48000; rng=np.random.default_rng(31)
src=open('synth.py').read(); src=src[:src.index("save('shot-a'")]; exec(src.split('\n',2)[2])
rng=np.random.default_rng(31)
def sub(f0,f1,tau,dur,amt=2.4):
    n=t(dur); f=f1+(f0-f1)*np.exp(-n/.07); return np.tanh(amt*np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-n/tau))
def mix(*parts,L=4.0):
    y=np.zeros(int(L*SR))
    for x,a,d in parts: at(y,x*a,d)
    return y
def magnum():   # I: a .44 with a sub-bass drop under it and a big room
    return verb(mix((shot(boomf=(110,32),btau=.25,tail=.8,wet=.2),1,0),(sub(70,24,.45,1.6),.8,.004)),1.8,.45,3000)
def cannon():   # J: a cannon: huge low boom, long rolling tail
    n=t(3.0); roll=lp(rng.standard_normal(len(n)),220,3)*(1-np.exp(-n/.03))*np.exp(-n/.9); roll/=np.max(np.abs(roll))
    return verb(mix((shot(boomf=(80,22),btau=.4,tail=1.2,wet=.2),1,0),(sub(55,18,.7,2.4,3),.9,.0),(roll,.55,.03)),2.6,.4,1800)
def movie():    # K: a movie gunshot: crack, punch, slapback off buildings, and a sub tail
    y=mix((shot(btau=.15,tail=.6,wet=.15),1,0),(sub(90,30,.3,1.2),.7,.003))
    head=y[:int(.35*SR)].copy(); [at(y,lp(head,2500-i*500)*a,d) for i,(d,a) in enumerate([(.16,.5),(.34,.32),(.6,.18)])]
    return verb(y,1.4,.35,4000)
def double():   # L: double tap, two shots back to back (the second is the one the moon hears)
    a=shot(btau=.14,tail=.4,wet=.1); return verb(mix((a,.75,0),(a,1,.16),(sub(80,28,.35,1.2),.7,.163)),1.5,.35,3500)
def save2(name,y):
    y=y/np.max(np.abs(y))*.95; wf.write(name+'.wav',SR,(y*32767).astype(np.int16))
    subprocess.run(['ffmpeg','-v','error','-y','-i',name+'.wav','-af','silenceremove=stop_periods=-1:stop_threshold=-60dB:stop_duration=0.3,volume=-1dB','-ar','48000','-ac','1','-c:a','aac','-b:a','128k',name+'.m4a'],check=True)
for k,f in [('i',magnum),('j',cannon),('k',movie),('l',double)]: save2('shot-'+k,f())
