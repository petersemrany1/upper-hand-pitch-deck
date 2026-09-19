(()=>{var n5=2;var s5=2;var o5=1,i5=2;var a5=4;var r5=1000;var H8="srgb";class T6{addEventListener(J,$){if(this._listeners===void 0)this._listeners={};let Q=this._listeners;if(Q[J]===void 0)Q[J]=[];if(Q[J].indexOf($)===-1)Q[J].push($)}hasEventListener(J,$){if(this._listeners===void 0)return!1;let Q=this._listeners;return Q[J]!==void 0&&Q[J].indexOf($)!==-1}removeEventListener(J,$){if(this._listeners===void 0)return;let Z=this._listeners[J];if(Z!==void 0){let W=Z.indexOf($);if(W!==-1)Z.splice(W,1)}}dispatchEvent(J){if(this._listeners===void 0)return;let Q=this._listeners[J.type];if(Q!==void 0){J.target=this;let Z=Q.slice(0);for(let W=0,Y=Z.length;W<Y;W++)Z[W].call(this,J);J.target=null}}}var O0=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];var k8=Math.PI/180,W9=180/Math.PI;function O6(){let J=Math.random()*4294967295|0,$=Math.random()*4294967295|0,Q=Math.random()*4294967295|0,Z=Math.random()*4294967295|0;return(O0[J&255]+O0[J>>8&255]+O0[J>>16&255]+O0[J>>24&255]+"-"+O0[$&255]+O0[$>>8&255]+"-"+O0[$>>16&15|64]+O0[$>>24&255]+"-"+O0[Q&63|128]+O0[Q>>8&255]+"-"+O0[Q>>16&255]+O0[Q>>24&255]+O0[Z&255]+O0[Z>>8&255]+O0[Z>>16&255]+O0[Z>>24&255]).toLowerCase()}function B0(J,$,Q){return Math.max($,Math.min(Q,J))}function e$(J,$){return(J%$+$)%$}function A8(J,$,Q){return(1-Q)*J+Q*$}function d0(J,$){switch($.constructor){case Float32Array:return J;case Uint32Array:return J/4294967295;case Uint16Array:return J/65535;case Uint8Array:return J/255;case Int32Array:return Math.max(J/2147483647,-1);case Int16Array:return Math.max(J/32767,-1);case Int8Array:return Math.max(J/127,-1);default:throw Error("Invalid component type.")}}function J0(J,$){switch($.constructor){case Float32Array:return J;case Uint32Array:return Math.round(J*4294967295);case Uint16Array:return Math.round(J*65535);case Uint8Array:return Math.round(J*255);case Int32Array:return Math.round(J*2147483647);case Int16Array:return Math.round(J*32767);case Int8Array:return Math.round(J*127);default:throw Error("Invalid component type.")}}class BJ{constructor(J=0,$=0){BJ.prototype.isVector2=!0,this.x=J,this.y=$}get width(){return this.x}set width(J){this.x=J}get height(){return this.y}set height(J){this.y=J}set(J,$){return this.x=J,this.y=$,this}setScalar(J){return this.x=J,this.y=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setComponent(J,$){switch(J){case 0:this.x=$;break;case 1:this.y=$;break;default:throw Error("index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;default:throw Error("index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y)}copy(J){return this.x=J.x,this.y=J.y,this}add(J){return this.x+=J.x,this.y+=J.y,this}addScalar(J){return this.x+=J,this.y+=J,this}addVectors(J,$){return this.x=J.x+$.x,this.y=J.y+$.y,this}addScaledVector(J,$){return this.x+=J.x*$,this.y+=J.y*$,this}sub(J){return this.x-=J.x,this.y-=J.y,this}subScalar(J){return this.x-=J,this.y-=J,this}subVectors(J,$){return this.x=J.x-$.x,this.y=J.y-$.y,this}multiply(J){return this.x*=J.x,this.y*=J.y,this}multiplyScalar(J){return this.x*=J,this.y*=J,this}divide(J){return this.x/=J.x,this.y/=J.y,this}divideScalar(J){return this.multiplyScalar(1/J)}applyMatrix3(J){let $=this.x,Q=this.y,Z=J.elements;return this.x=Z[0]*$+Z[3]*Q+Z[6],this.y=Z[1]*$+Z[4]*Q+Z[7],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this}clamp(J,$){return this.x=Math.max(J.x,Math.min($.x,this.x)),this.y=Math.max(J.y,Math.min($.y,this.y)),this}clampScalar(J,$){return this.x=Math.max(J,Math.min($,this.x)),this.y=Math.max(J,Math.min($,this.y)),this}clampLength(J,$){let Q=this.length();return this.divideScalar(Q||1).multiplyScalar(Math.max(J,Math.min($,Q)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(J){return this.x*J.x+this.y*J.y}cross(J){return this.x*J.y-this.y*J.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(J){let $=Math.sqrt(this.lengthSq()*J.lengthSq());if($===0)return Math.PI/2;let Q=this.dot(J)/$;return Math.acos(B0(Q,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let $=this.x-J.x,Q=this.y-J.y;return $*$+Q*Q}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,$){return this.x+=(J.x-this.x)*$,this.y+=(J.y-this.y)*$,this}lerpVectors(J,$,Q){return this.x=J.x+($.x-J.x)*Q,this.y=J.y+($.y-J.y)*Q,this}equals(J){return J.x===this.x&&J.y===this.y}fromArray(J,$=0){return this.x=J[$],this.y=J[$+1],this}toArray(J=[],$=0){return J[$]=this.x,J[$+1]=this.y,J}fromBufferAttribute(J,$){return this.x=J.getX($),this.y=J.getY($),this}rotateAround(J,$){let Q=Math.cos($),Z=Math.sin($),W=this.x-J.x,Y=this.y-J.y;return this.x=W*Q-Y*Z+J.x,this.y=W*Z+Y*Q+J.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class lJ{constructor(J,$,Q,Z,W,Y,K,X,U){if(lJ.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],J!==void 0)this.set(J,$,Q,Z,W,Y,K,X,U)}set(J,$,Q,Z,W,Y,K,X,U){let H=this.elements;return H[0]=J,H[1]=Z,H[2]=K,H[3]=$,H[4]=W,H[5]=X,H[6]=Q,H[7]=Y,H[8]=U,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(J){let $=this.elements,Q=J.elements;return $[0]=Q[0],$[1]=Q[1],$[2]=Q[2],$[3]=Q[3],$[4]=Q[4],$[5]=Q[5],$[6]=Q[6],$[7]=Q[7],$[8]=Q[8],this}extractBasis(J,$,Q){return J.setFromMatrix3Column(this,0),$.setFromMatrix3Column(this,1),Q.setFromMatrix3Column(this,2),this}setFromMatrix4(J){let $=J.elements;return this.set($[0],$[4],$[8],$[1],$[5],$[9],$[2],$[6],$[10]),this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,$){let Q=J.elements,Z=$.elements,W=this.elements,Y=Q[0],K=Q[3],X=Q[6],U=Q[1],H=Q[4],G=Q[7],V=Q[2],q=Q[5],D=Q[8],O=Z[0],M=Z[3],F=Z[6],E=Z[1],z=Z[4],N=Z[7],k=Z[2],f=Z[5],w=Z[8];return W[0]=Y*O+K*E+X*k,W[3]=Y*M+K*z+X*f,W[6]=Y*F+K*N+X*w,W[1]=U*O+H*E+G*k,W[4]=U*M+H*z+G*f,W[7]=U*F+H*N+G*w,W[2]=V*O+q*E+D*k,W[5]=V*M+q*z+D*f,W[8]=V*F+q*N+D*w,this}multiplyScalar(J){let $=this.elements;return $[0]*=J,$[3]*=J,$[6]*=J,$[1]*=J,$[4]*=J,$[7]*=J,$[2]*=J,$[5]*=J,$[8]*=J,this}determinant(){let J=this.elements,$=J[0],Q=J[1],Z=J[2],W=J[3],Y=J[4],K=J[5],X=J[6],U=J[7],H=J[8];return $*Y*H-$*K*U-Q*W*H+Q*K*X+Z*W*U-Z*Y*X}invert(){let J=this.elements,$=J[0],Q=J[1],Z=J[2],W=J[3],Y=J[4],K=J[5],X=J[6],U=J[7],H=J[8],G=H*Y-K*U,V=K*X-H*W,q=U*W-Y*X,D=$*G+Q*V+Z*q;if(D===0)return this.set(0,0,0,0,0,0,0,0,0);let O=1/D;return J[0]=G*O,J[1]=(Z*U-H*Q)*O,J[2]=(K*Q-Z*Y)*O,J[3]=V*O,J[4]=(H*$-Z*X)*O,J[5]=(Z*W-K*$)*O,J[6]=q*O,J[7]=(Q*X-U*$)*O,J[8]=(Y*$-Q*W)*O,this}transpose(){let J,$=this.elements;return J=$[1],$[1]=$[3],$[3]=J,J=$[2],$[2]=$[6],$[6]=J,J=$[5],$[5]=$[7],$[7]=J,this}getNormalMatrix(J){return this.setFromMatrix4(J).invert().transpose()}transposeIntoArray(J){let $=this.elements;return J[0]=$[0],J[1]=$[3],J[2]=$[6],J[3]=$[1],J[4]=$[4],J[5]=$[7],J[6]=$[2],J[7]=$[5],J[8]=$[8],this}setUvTransform(J,$,Q,Z,W,Y,K){let X=Math.cos(W),U=Math.sin(W);return this.set(Q*X,Q*U,-Q*(X*Y+U*K)+Y+J,-Z*U,Z*X,-Z*(-U*Y+X*K)+K+$,0,0,1),this}scale(J,$){return this.premultiply(w8.makeScale(J,$)),this}rotate(J){return this.premultiply(w8.makeRotation(-J)),this}translate(J,$){return this.premultiply(w8.makeTranslation(J,$)),this}makeTranslation(J,$){if(J.isVector2)this.set(1,0,J.x,0,1,J.y,0,0,1);else this.set(1,0,J,0,1,$,0,0,1);return this}makeRotation(J){let $=Math.cos(J),Q=Math.sin(J);return this.set($,-Q,0,Q,$,0,0,0,1),this}makeScale(J,$){return this.set(J,0,0,0,$,0,0,0,1),this}equals(J){let $=this.elements,Q=J.elements;for(let Z=0;Z<9;Z++)if($[Z]!==Q[Z])return!1;return!0}fromArray(J,$=0){for(let Q=0;Q<9;Q++)this.elements[Q]=J[Q+$];return this}toArray(J=[],$=0){let Q=this.elements;return J[$]=Q[0],J[$+1]=Q[1],J[$+2]=Q[2],J[$+3]=Q[3],J[$+4]=Q[4],J[$+5]=Q[5],J[$+6]=Q[6],J[$+7]=Q[7],J[$+8]=Q[8],J}clone(){return new this.constructor().fromArray(this.elements)}}var w8=new lJ;function t5(J){for(let $=J.length-1;$>=0;--$)if(J[$]>=65535)return!0;return!1}function X8(J){return document.createElementNS("http://www.w3.org/1999/xhtml",J)}function JQ(){let J=X8("canvas");return J.style.display="block",J}var n9={};function L7(J){if(J in n9)return;n9[J]=!0,console.warn(J)}function $Q(J,$,Q){return new Promise(function(Z,W){function Y(){switch(J.clientWaitSync($,J.SYNC_FLUSH_COMMANDS_BIT,0)){case J.WAIT_FAILED:W();break;case J.TIMEOUT_EXPIRED:setTimeout(Y,Q);break;default:Z()}}setTimeout(Y,Q)})}function QQ(J){let $=J.elements;$[2]=0.5*$[2]+0.5*$[3],$[6]=0.5*$[6]+0.5*$[7],$[10]=0.5*$[10]+0.5*$[11],$[14]=0.5*$[14]+0.5*$[15]}function ZQ(J){let $=J.elements;if($[11]===-1)$[10]=-$[10]-1,$[14]=-$[14];else $[10]=-$[10],$[14]=-$[14]+1}var oJ={enabled:!0,workingColorSpace:"srgb-linear",spaces:{},convert:function(J,$,Q){if(this.enabled===!1||$===Q||!$||!Q)return J;if(this.spaces[$].transfer==="srgb")J.r=Q6(J.r),J.g=Q6(J.g),J.b=Q6(J.b);if(this.spaces[$].primaries!==this.spaces[Q].primaries)J.applyMatrix3(this.spaces[$].toXYZ),J.applyMatrix3(this.spaces[Q].fromXYZ);if(this.spaces[Q].transfer==="srgb")J.r=J7(J.r),J.g=J7(J.g),J.b=J7(J.b);return J},fromWorkingColorSpace:function(J,$){return this.convert(J,this.workingColorSpace,$)},toWorkingColorSpace:function(J,$){return this.convert(J,$,this.workingColorSpace)},getPrimaries:function(J){return this.spaces[J].primaries},getTransfer:function(J){if(J==="")return"linear";return this.spaces[J].transfer},getLuminanceCoefficients:function(J,$=this.workingColorSpace){return J.fromArray(this.spaces[$].luminanceCoefficients)},define:function(J){Object.assign(this.spaces,J)},_getMatrix:function(J,$,Q){return J.copy(this.spaces[$].toXYZ).multiply(this.spaces[Q].fromXYZ)},_getDrawingBufferColorSpace:function(J){return this.spaces[J].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(J=this.workingColorSpace){return this.spaces[J].workingColorSpaceConfig.unpackColorSpace}};function Q6(J){return J<0.04045?J*0.0773993808:Math.pow(J*0.9478672986+0.0521327014,2.4)}function J7(J){return J<0.0031308?J*12.92:1.055*Math.pow(J,0.41666)-0.055}var s9=[0.64,0.33,0.3,0.6,0.15,0.06],o9=[0.2126,0.7152,0.0722],i9=[0.3127,0.329],a9=new lJ().set(0.4123908,0.3575843,0.1804808,0.212639,0.7151687,0.0721923,0.0193308,0.1191948,0.9505322),r9=new lJ().set(3.2409699,-1.5373832,-0.4986108,-0.9692436,1.8759675,0.0415551,0.0556301,-0.203977,1.0569715);oJ.define({["srgb-linear"]:{primaries:s9,whitePoint:i9,transfer:"linear",toXYZ:a9,fromXYZ:r9,luminanceCoefficients:o9,workingColorSpaceConfig:{unpackColorSpace:"srgb"},outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}},["srgb"]:{primaries:s9,whitePoint:i9,transfer:"srgb",toXYZ:a9,fromXYZ:r9,luminanceCoefficients:o9,outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}}});var f6;class e5{static getDataURL(J){if(/^data:/i.test(J.src))return J.src;if(typeof HTMLCanvasElement>"u")return J.src;let $;if(J instanceof HTMLCanvasElement)$=J;else{if(f6===void 0)f6=X8("canvas");f6.width=J.width,f6.height=J.height;let Q=f6.getContext("2d");if(J instanceof ImageData)Q.putImageData(J,0,0);else Q.drawImage(J,0,0,J.width,J.height);$=f6}if($.width>2048||$.height>2048)return console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",J),$.toDataURL("image/jpeg",0.6);else return $.toDataURL("image/png")}static sRGBToLinear(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap){let $=X8("canvas");$.width=J.width,$.height=J.height;let Q=$.getContext("2d");Q.drawImage(J,0,0,J.width,J.height);let Z=Q.getImageData(0,0,J.width,J.height),W=Z.data;for(let Y=0;Y<W.length;Y++)W[Y]=Q6(W[Y]/255)*255;return Q.putImageData(Z,0,0),$}else if(J.data){let $=J.data.slice(0);for(let Q=0;Q<$.length;Q++)if($ instanceof Uint8Array||$ instanceof Uint8ClampedArray)$[Q]=Math.floor(Q6($[Q]/255)*255);else $[Q]=Q6($[Q]);return{data:$,width:J.width,height:J.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),J}}var WQ=0;class U9{constructor(J=null){this.isSource=!0,Object.defineProperty(this,"id",{value:WQ++}),this.uuid=O6(),this.data=J,this.dataReady=!0,this.version=0}set needsUpdate(J){if(J===!0)this.version++}toJSON(J){let $=J===void 0||typeof J==="string";if(!$&&J.images[this.uuid]!==void 0)return J.images[this.uuid];let Q={uuid:this.uuid,url:""},Z=this.data;if(Z!==null){let W;if(Array.isArray(Z)){W=[];for(let Y=0,K=Z.length;Y<K;Y++)if(Z[Y].isDataTexture)W.push(I8(Z[Y].image));else W.push(I8(Z[Y]))}else W=I8(Z);Q.url=W}if(!$)J.images[this.uuid]=Q;return Q}}function I8(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap)return e5.getDataURL(J);else if(J.data)return{data:Array.from(J.data),width:J.width,height:J.height,type:J.data.constructor.name};else return console.warn("THREE.Texture: Unable to serialize Texture."),{}}var YQ=0;class L0 extends T6{constructor(J=L0.DEFAULT_IMAGE,$=L0.DEFAULT_MAPPING,Q=1001,Z=1001,W=1006,Y=1008,K=1023,X=1009,U=L0.DEFAULT_ANISOTROPY,H=""){super();this.isTexture=!0,Object.defineProperty(this,"id",{value:YQ++}),this.uuid=O6(),this.name="",this.source=new U9(J),this.mipmaps=[],this.mapping=$,this.channel=0,this.wrapS=Q,this.wrapT=Z,this.magFilter=W,this.minFilter=Y,this.anisotropy=U,this.format=K,this.internalFormat=null,this.type=X,this.offset=new BJ(0,0),this.repeat=new BJ(1,1),this.center=new BJ(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new lJ,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=H,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(J=null){this.source.data=J}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(J){return this.name=J.name,this.source=J.source,this.mipmaps=J.mipmaps.slice(0),this.mapping=J.mapping,this.channel=J.channel,this.wrapS=J.wrapS,this.wrapT=J.wrapT,this.magFilter=J.magFilter,this.minFilter=J.minFilter,this.anisotropy=J.anisotropy,this.format=J.format,this.internalFormat=J.internalFormat,this.type=J.type,this.offset.copy(J.offset),this.repeat.copy(J.repeat),this.center.copy(J.center),this.rotation=J.rotation,this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrix.copy(J.matrix),this.generateMipmaps=J.generateMipmaps,this.premultiplyAlpha=J.premultiplyAlpha,this.flipY=J.flipY,this.unpackAlignment=J.unpackAlignment,this.colorSpace=J.colorSpace,this.userData=JSON.parse(JSON.stringify(J.userData)),this.needsUpdate=!0,this}toJSON(J){let $=J===void 0||typeof J==="string";if(!$&&J.textures[this.uuid]!==void 0)return J.textures[this.uuid];let Q={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(J).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(Object.keys(this.userData).length>0)Q.userData=this.userData;if(!$)J.textures[this.uuid]=Q;return Q}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(J){if(this.mapping!==300)return J;if(J.applyMatrix3(this.matrix),J.x<0||J.x>1)switch(this.wrapS){case 1000:J.x=J.x-Math.floor(J.x);break;case 1001:J.x=J.x<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.x)%2)===1)J.x=Math.ceil(J.x)-J.x;else J.x=J.x-Math.floor(J.x);break}if(J.y<0||J.y>1)switch(this.wrapT){case 1000:J.y=J.y-Math.floor(J.y);break;case 1001:J.y=J.y<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.y)%2)===1)J.y=Math.ceil(J.y)-J.y;else J.y=J.y-Math.floor(J.y);break}if(this.flipY)J.y=1-J.y;return J}set needsUpdate(J){if(J===!0)this.version++,this.source.needsUpdate=!0}set needsPMREMUpdate(J){if(J===!0)this.pmremVersion++}}L0.DEFAULT_IMAGE=null;L0.DEFAULT_MAPPING=300;L0.DEFAULT_ANISOTROPY=1;class H0{constructor(J=0,$=0,Q=0,Z=1){H0.prototype.isVector4=!0,this.x=J,this.y=$,this.z=Q,this.w=Z}get width(){return this.z}set width(J){this.z=J}get height(){return this.w}set height(J){this.w=J}set(J,$,Q,Z){return this.x=J,this.y=$,this.z=Q,this.w=Z,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this.w=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setW(J){return this.w=J,this}setComponent(J,$){switch(J){case 0:this.x=$;break;case 1:this.y=$;break;case 2:this.z=$;break;case 3:this.w=$;break;default:throw Error("index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error("index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this.w=J.w!==void 0?J.w:1,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this.w+=J.w,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this.w+=J,this}addVectors(J,$){return this.x=J.x+$.x,this.y=J.y+$.y,this.z=J.z+$.z,this.w=J.w+$.w,this}addScaledVector(J,$){return this.x+=J.x*$,this.y+=J.y*$,this.z+=J.z*$,this.w+=J.w*$,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this.w-=J.w,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this.w-=J,this}subVectors(J,$){return this.x=J.x-$.x,this.y=J.y-$.y,this.z=J.z-$.z,this.w=J.w-$.w,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this.w*=J.w,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this.w*=J,this}applyMatrix4(J){let $=this.x,Q=this.y,Z=this.z,W=this.w,Y=J.elements;return this.x=Y[0]*$+Y[4]*Q+Y[8]*Z+Y[12]*W,this.y=Y[1]*$+Y[5]*Q+Y[9]*Z+Y[13]*W,this.z=Y[2]*$+Y[6]*Q+Y[10]*Z+Y[14]*W,this.w=Y[3]*$+Y[7]*Q+Y[11]*Z+Y[15]*W,this}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this.w/=J.w,this}divideScalar(J){return this.multiplyScalar(1/J)}setAxisAngleFromQuaternion(J){this.w=2*Math.acos(J.w);let $=Math.sqrt(1-J.w*J.w);if($<0.0001)this.x=1,this.y=0,this.z=0;else this.x=J.x/$,this.y=J.y/$,this.z=J.z/$;return this}setAxisAngleFromRotationMatrix(J){let $,Q,Z,W,Y=0.01,K=0.1,X=J.elements,U=X[0],H=X[4],G=X[8],V=X[1],q=X[5],D=X[9],O=X[2],M=X[6],F=X[10];if(Math.abs(H-V)<0.01&&Math.abs(G-O)<0.01&&Math.abs(D-M)<0.01){if(Math.abs(H+V)<0.1&&Math.abs(G+O)<0.1&&Math.abs(D+M)<0.1&&Math.abs(U+q+F-3)<0.1)return this.set(1,0,0,0),this;$=Math.PI;let z=(U+1)/2,N=(q+1)/2,k=(F+1)/2,f=(H+V)/4,w=(G+O)/4,I=(D+M)/4;if(z>N&&z>k)if(z<0.01)Q=0,Z=0.707106781,W=0.707106781;else Q=Math.sqrt(z),Z=f/Q,W=w/Q;else if(N>k)if(N<0.01)Q=0.707106781,Z=0,W=0.707106781;else Z=Math.sqrt(N),Q=f/Z,W=I/Z;else if(k<0.01)Q=0.707106781,Z=0.707106781,W=0;else W=Math.sqrt(k),Q=w/W,Z=I/W;return this.set(Q,Z,W,$),this}let E=Math.sqrt((M-D)*(M-D)+(G-O)*(G-O)+(V-H)*(V-H));if(Math.abs(E)<0.001)E=1;return this.x=(M-D)/E,this.y=(G-O)/E,this.z=(V-H)/E,this.w=Math.acos((U+q+F-1)/2),this}setFromMatrixPosition(J){let $=J.elements;return this.x=$[12],this.y=$[13],this.z=$[14],this.w=$[15],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this.w=Math.min(this.w,J.w),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this.w=Math.max(this.w,J.w),this}clamp(J,$){return this.x=Math.max(J.x,Math.min($.x,this.x)),this.y=Math.max(J.y,Math.min($.y,this.y)),this.z=Math.max(J.z,Math.min($.z,this.z)),this.w=Math.max(J.w,Math.min($.w,this.w)),this}clampScalar(J,$){return this.x=Math.max(J,Math.min($,this.x)),this.y=Math.max(J,Math.min($,this.y)),this.z=Math.max(J,Math.min($,this.z)),this.w=Math.max(J,Math.min($,this.w)),this}clampLength(J,$){let Q=this.length();return this.divideScalar(Q||1).multiplyScalar(Math.max(J,Math.min($,Q)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z+this.w*J.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,$){return this.x+=(J.x-this.x)*$,this.y+=(J.y-this.y)*$,this.z+=(J.z-this.z)*$,this.w+=(J.w-this.w)*$,this}lerpVectors(J,$,Q){return this.x=J.x+($.x-J.x)*Q,this.y=J.y+($.y-J.y)*Q,this.z=J.z+($.z-J.z)*Q,this.w=J.w+($.w-J.w)*Q,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z&&J.w===this.w}fromArray(J,$=0){return this.x=J[$],this.y=J[$+1],this.z=J[$+2],this.w=J[$+3],this}toArray(J=[],$=0){return J[$]=this.x,J[$+1]=this.y,J[$+2]=this.z,J[$+3]=this.w,J}fromBufferAttribute(J,$){return this.x=J.getX($),this.y=J.getY($),this.z=J.getZ($),this.w=J.getW($),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class J$ extends T6{constructor(J=1,$=1,Q={}){super();this.isRenderTarget=!0,this.width=J,this.height=$,this.depth=1,this.scissor=new H0(0,0,J,$),this.scissorTest=!1,this.viewport=new H0(0,0,J,$);let Z={width:J,height:$,depth:1};Q=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1},Q);let W=new L0(Z,Q.mapping,Q.wrapS,Q.wrapT,Q.magFilter,Q.minFilter,Q.format,Q.type,Q.anisotropy,Q.colorSpace);W.flipY=!1,W.generateMipmaps=Q.generateMipmaps,W.internalFormat=Q.internalFormat,this.textures=[];let Y=Q.count;for(let K=0;K<Y;K++)this.textures[K]=W.clone(),this.textures[K].isRenderTargetTexture=!0;this.depthBuffer=Q.depthBuffer,this.stencilBuffer=Q.stencilBuffer,this.resolveDepthBuffer=Q.resolveDepthBuffer,this.resolveStencilBuffer=Q.resolveStencilBuffer,this.depthTexture=Q.depthTexture,this.samples=Q.samples}get texture(){return this.textures[0]}set texture(J){this.textures[0]=J}setSize(J,$,Q=1){if(this.width!==J||this.height!==$||this.depth!==Q){this.width=J,this.height=$,this.depth=Q;for(let Z=0,W=this.textures.length;Z<W;Z++)this.textures[Z].image.width=J,this.textures[Z].image.height=$,this.textures[Z].image.depth=Q;this.dispose()}this.viewport.set(0,0,J,$),this.scissor.set(0,0,J,$)}clone(){return new this.constructor().copy(this)}copy(J){this.width=J.width,this.height=J.height,this.depth=J.depth,this.scissor.copy(J.scissor),this.scissorTest=J.scissorTest,this.viewport.copy(J.viewport),this.textures.length=0;for(let Q=0,Z=J.textures.length;Q<Z;Q++)this.textures[Q]=J.textures[Q].clone(),this.textures[Q].isRenderTargetTexture=!0;let $=Object.assign({},J.texture.image);if(this.texture.source=new U9($),this.depthBuffer=J.depthBuffer,this.stencilBuffer=J.stencilBuffer,this.resolveDepthBuffer=J.resolveDepthBuffer,this.resolveStencilBuffer=J.resolveStencilBuffer,J.depthTexture!==null)this.depthTexture=J.depthTexture.clone();return this.samples=J.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class M6 extends J${constructor(J=1,$=1,Q={}){super(J,$,Q);this.isWebGLRenderTarget=!0}}class H9 extends L0{constructor(J=null,$=1,Q=1,Z=1){super(null);this.isDataArrayTexture=!0,this.image={data:J,width:$,height:Q,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(J){this.layerUpdates.add(J)}clearLayerUpdates(){this.layerUpdates.clear()}}class $$ extends L0{constructor(J=null,$=1,Q=1,Z=1){super(null);this.isData3DTexture=!0,this.image={data:J,width:$,height:Q,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class P6{constructor(J=0,$=0,Q=0,Z=1){this.isQuaternion=!0,this._x=J,this._y=$,this._z=Q,this._w=Z}static slerpFlat(J,$,Q,Z,W,Y,K){let X=Q[Z+0],U=Q[Z+1],H=Q[Z+2],G=Q[Z+3],V=W[Y+0],q=W[Y+1],D=W[Y+2],O=W[Y+3];if(K===0){J[$+0]=X,J[$+1]=U,J[$+2]=H,J[$+3]=G;return}if(K===1){J[$+0]=V,J[$+1]=q,J[$+2]=D,J[$+3]=O;return}if(G!==O||X!==V||U!==q||H!==D){let M=1-K,F=X*V+U*q+H*D+G*O,E=F>=0?1:-1,z=1-F*F;if(z>Number.EPSILON){let k=Math.sqrt(z),f=Math.atan2(k,F*E);M=Math.sin(M*f)/k,K=Math.sin(K*f)/k}let N=K*E;if(X=X*M+V*N,U=U*M+q*N,H=H*M+D*N,G=G*M+O*N,M===1-K){let k=1/Math.sqrt(X*X+U*U+H*H+G*G);X*=k,U*=k,H*=k,G*=k}}J[$]=X,J[$+1]=U,J[$+2]=H,J[$+3]=G}static multiplyQuaternionsFlat(J,$,Q,Z,W,Y){let K=Q[Z],X=Q[Z+1],U=Q[Z+2],H=Q[Z+3],G=W[Y],V=W[Y+1],q=W[Y+2],D=W[Y+3];return J[$]=K*D+H*G+X*q-U*V,J[$+1]=X*D+H*V+U*G-K*q,J[$+2]=U*D+H*q+K*V-X*G,J[$+3]=H*D-K*G-X*V-U*q,J}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get w(){return this._w}set w(J){this._w=J,this._onChangeCallback()}set(J,$,Q,Z){return this._x=J,this._y=$,this._z=Q,this._w=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(J){return this._x=J.x,this._y=J.y,this._z=J.z,this._w=J.w,this._onChangeCallback(),this}setFromEuler(J,$=!0){let{_x:Q,_y:Z,_z:W,_order:Y}=J,K=Math.cos,X=Math.sin,U=K(Q/2),H=K(Z/2),G=K(W/2),V=X(Q/2),q=X(Z/2),D=X(W/2);switch(Y){case"XYZ":this._x=V*H*G+U*q*D,this._y=U*q*G-V*H*D,this._z=U*H*D+V*q*G,this._w=U*H*G-V*q*D;break;case"YXZ":this._x=V*H*G+U*q*D,this._y=U*q*G-V*H*D,this._z=U*H*D-V*q*G,this._w=U*H*G+V*q*D;break;case"ZXY":this._x=V*H*G-U*q*D,this._y=U*q*G+V*H*D,this._z=U*H*D+V*q*G,this._w=U*H*G-V*q*D;break;case"ZYX":this._x=V*H*G-U*q*D,this._y=U*q*G+V*H*D,this._z=U*H*D-V*q*G,this._w=U*H*G+V*q*D;break;case"YZX":this._x=V*H*G+U*q*D,this._y=U*q*G+V*H*D,this._z=U*H*D-V*q*G,this._w=U*H*G-V*q*D;break;case"XZY":this._x=V*H*G-U*q*D,this._y=U*q*G-V*H*D,this._z=U*H*D+V*q*G,this._w=U*H*G+V*q*D;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+Y)}if($===!0)this._onChangeCallback();return this}setFromAxisAngle(J,$){let Q=$/2,Z=Math.sin(Q);return this._x=J.x*Z,this._y=J.y*Z,this._z=J.z*Z,this._w=Math.cos(Q),this._onChangeCallback(),this}setFromRotationMatrix(J){let $=J.elements,Q=$[0],Z=$[4],W=$[8],Y=$[1],K=$[5],X=$[9],U=$[2],H=$[6],G=$[10],V=Q+K+G;if(V>0){let q=0.5/Math.sqrt(V+1);this._w=0.25/q,this._x=(H-X)*q,this._y=(W-U)*q,this._z=(Y-Z)*q}else if(Q>K&&Q>G){let q=2*Math.sqrt(1+Q-K-G);this._w=(H-X)/q,this._x=0.25*q,this._y=(Z+Y)/q,this._z=(W+U)/q}else if(K>G){let q=2*Math.sqrt(1+K-Q-G);this._w=(W-U)/q,this._x=(Z+Y)/q,this._y=0.25*q,this._z=(X+H)/q}else{let q=2*Math.sqrt(1+G-Q-K);this._w=(Y-Z)/q,this._x=(W+U)/q,this._y=(X+H)/q,this._z=0.25*q}return this._onChangeCallback(),this}setFromUnitVectors(J,$){let Q=J.dot($)+1;if(Q<Number.EPSILON)if(Q=0,Math.abs(J.x)>Math.abs(J.z))this._x=-J.y,this._y=J.x,this._z=0,this._w=Q;else this._x=0,this._y=-J.z,this._z=J.y,this._w=Q;else this._x=J.y*$.z-J.z*$.y,this._y=J.z*$.x-J.x*$.z,this._z=J.x*$.y-J.y*$.x,this._w=Q;return this.normalize()}angleTo(J){return 2*Math.acos(Math.abs(B0(this.dot(J),-1,1)))}rotateTowards(J,$){let Q=this.angleTo(J);if(Q===0)return this;let Z=Math.min(1,$/Q);return this.slerp(J,Z),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(J){return this._x*J._x+this._y*J._y+this._z*J._z+this._w*J._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let J=this.length();if(J===0)this._x=0,this._y=0,this._z=0,this._w=1;else J=1/J,this._x=this._x*J,this._y=this._y*J,this._z=this._z*J,this._w=this._w*J;return this._onChangeCallback(),this}multiply(J){return this.multiplyQuaternions(this,J)}premultiply(J){return this.multiplyQuaternions(J,this)}multiplyQuaternions(J,$){let{_x:Q,_y:Z,_z:W,_w:Y}=J,K=$._x,X=$._y,U=$._z,H=$._w;return this._x=Q*H+Y*K+Z*U-W*X,this._y=Z*H+Y*X+W*K-Q*U,this._z=W*H+Y*U+Q*X-Z*K,this._w=Y*H-Q*K-Z*X-W*U,this._onChangeCallback(),this}slerp(J,$){if($===0)return this;if($===1)return this.copy(J);let Q=this._x,Z=this._y,W=this._z,Y=this._w,K=Y*J._w+Q*J._x+Z*J._y+W*J._z;if(K<0)this._w=-J._w,this._x=-J._x,this._y=-J._y,this._z=-J._z,K=-K;else this.copy(J);if(K>=1)return this._w=Y,this._x=Q,this._y=Z,this._z=W,this;let X=1-K*K;if(X<=Number.EPSILON){let q=1-$;return this._w=q*Y+$*this._w,this._x=q*Q+$*this._x,this._y=q*Z+$*this._y,this._z=q*W+$*this._z,this.normalize(),this}let U=Math.sqrt(X),H=Math.atan2(U,K),G=Math.sin((1-$)*H)/U,V=Math.sin($*H)/U;return this._w=Y*G+this._w*V,this._x=Q*G+this._x*V,this._y=Z*G+this._y*V,this._z=W*G+this._z*V,this._onChangeCallback(),this}slerpQuaternions(J,$,Q){return this.copy(J).slerp($,Q)}random(){let J=2*Math.PI*Math.random(),$=2*Math.PI*Math.random(),Q=Math.random(),Z=Math.sqrt(1-Q),W=Math.sqrt(Q);return this.set(Z*Math.sin(J),Z*Math.cos(J),W*Math.sin($),W*Math.cos($))}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._w===this._w}fromArray(J,$=0){return this._x=J[$],this._y=J[$+1],this._z=J[$+2],this._w=J[$+3],this._onChangeCallback(),this}toArray(J=[],$=0){return J[$]=this._x,J[$+1]=this._y,J[$+2]=this._z,J[$+3]=this._w,J}fromBufferAttribute(J,$){return this._x=J.getX($),this._y=J.getY($),this._z=J.getZ($),this._w=J.getW($),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class A{constructor(J=0,$=0,Q=0){A.prototype.isVector3=!0,this.x=J,this.y=$,this.z=Q}set(J,$,Q){if(Q===void 0)Q=this.z;return this.x=J,this.y=$,this.z=Q,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setComponent(J,$){switch(J){case 0:this.x=$;break;case 1:this.y=$;break;case 2:this.z=$;break;default:throw Error("index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error("index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this}addVectors(J,$){return this.x=J.x+$.x,this.y=J.y+$.y,this.z=J.z+$.z,this}addScaledVector(J,$){return this.x+=J.x*$,this.y+=J.y*$,this.z+=J.z*$,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this}subVectors(J,$){return this.x=J.x-$.x,this.y=J.y-$.y,this.z=J.z-$.z,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this}multiplyVectors(J,$){return this.x=J.x*$.x,this.y=J.y*$.y,this.z=J.z*$.z,this}applyEuler(J){return this.applyQuaternion(t9.setFromEuler(J))}applyAxisAngle(J,$){return this.applyQuaternion(t9.setFromAxisAngle(J,$))}applyMatrix3(J){let $=this.x,Q=this.y,Z=this.z,W=J.elements;return this.x=W[0]*$+W[3]*Q+W[6]*Z,this.y=W[1]*$+W[4]*Q+W[7]*Z,this.z=W[2]*$+W[5]*Q+W[8]*Z,this}applyNormalMatrix(J){return this.applyMatrix3(J).normalize()}applyMatrix4(J){let $=this.x,Q=this.y,Z=this.z,W=J.elements,Y=1/(W[3]*$+W[7]*Q+W[11]*Z+W[15]);return this.x=(W[0]*$+W[4]*Q+W[8]*Z+W[12])*Y,this.y=(W[1]*$+W[5]*Q+W[9]*Z+W[13])*Y,this.z=(W[2]*$+W[6]*Q+W[10]*Z+W[14])*Y,this}applyQuaternion(J){let $=this.x,Q=this.y,Z=this.z,W=J.x,Y=J.y,K=J.z,X=J.w,U=2*(Y*Z-K*Q),H=2*(K*$-W*Z),G=2*(W*Q-Y*$);return this.x=$+X*U+Y*G-K*H,this.y=Q+X*H+K*U-W*G,this.z=Z+X*G+W*H-Y*U,this}project(J){return this.applyMatrix4(J.matrixWorldInverse).applyMatrix4(J.projectionMatrix)}unproject(J){return this.applyMatrix4(J.projectionMatrixInverse).applyMatrix4(J.matrixWorld)}transformDirection(J){let $=this.x,Q=this.y,Z=this.z,W=J.elements;return this.x=W[0]*$+W[4]*Q+W[8]*Z,this.y=W[1]*$+W[5]*Q+W[9]*Z,this.z=W[2]*$+W[6]*Q+W[10]*Z,this.normalize()}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this}divideScalar(J){return this.multiplyScalar(1/J)}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this}clamp(J,$){return this.x=Math.max(J.x,Math.min($.x,this.x)),this.y=Math.max(J.y,Math.min($.y,this.y)),this.z=Math.max(J.z,Math.min($.z,this.z)),this}clampScalar(J,$){return this.x=Math.max(J,Math.min($,this.x)),this.y=Math.max(J,Math.min($,this.y)),this.z=Math.max(J,Math.min($,this.z)),this}clampLength(J,$){let Q=this.length();return this.divideScalar(Q||1).multiplyScalar(Math.max(J,Math.min($,Q)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,$){return this.x+=(J.x-this.x)*$,this.y+=(J.y-this.y)*$,this.z+=(J.z-this.z)*$,this}lerpVectors(J,$,Q){return this.x=J.x+($.x-J.x)*Q,this.y=J.y+($.y-J.y)*Q,this.z=J.z+($.z-J.z)*Q,this}cross(J){return this.crossVectors(this,J)}crossVectors(J,$){let{x:Q,y:Z,z:W}=J,Y=$.x,K=$.y,X=$.z;return this.x=Z*X-W*K,this.y=W*Y-Q*X,this.z=Q*K-Z*Y,this}projectOnVector(J){let $=J.lengthSq();if($===0)return this.set(0,0,0);let Q=J.dot(this)/$;return this.copy(J).multiplyScalar(Q)}projectOnPlane(J){return T8.copy(this).projectOnVector(J),this.sub(T8)}reflect(J){return this.sub(T8.copy(J).multiplyScalar(2*this.dot(J)))}angleTo(J){let $=Math.sqrt(this.lengthSq()*J.lengthSq());if($===0)return Math.PI/2;let Q=this.dot(J)/$;return Math.acos(B0(Q,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let $=this.x-J.x,Q=this.y-J.y,Z=this.z-J.z;return $*$+Q*Q+Z*Z}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)+Math.abs(this.z-J.z)}setFromSpherical(J){return this.setFromSphericalCoords(J.radius,J.phi,J.theta)}setFromSphericalCoords(J,$,Q){let Z=Math.sin($)*J;return this.x=Z*Math.sin(Q),this.y=Math.cos($)*J,this.z=Z*Math.cos(Q),this}setFromCylindrical(J){return this.setFromCylindricalCoords(J.radius,J.theta,J.y)}setFromCylindricalCoords(J,$,Q){return this.x=J*Math.sin($),this.y=Q,this.z=J*Math.cos($),this}setFromMatrixPosition(J){let $=J.elements;return this.x=$[12],this.y=$[13],this.z=$[14],this}setFromMatrixScale(J){let $=this.setFromMatrixColumn(J,0).length(),Q=this.setFromMatrixColumn(J,1).length(),Z=this.setFromMatrixColumn(J,2).length();return this.x=$,this.y=Q,this.z=Z,this}setFromMatrixColumn(J,$){return this.fromArray(J.elements,$*4)}setFromMatrix3Column(J,$){return this.fromArray(J.elements,$*3)}setFromEuler(J){return this.x=J._x,this.y=J._y,this.z=J._z,this}setFromColor(J){return this.x=J.r,this.y=J.g,this.z=J.b,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z}fromArray(J,$=0){return this.x=J[$],this.y=J[$+1],this.z=J[$+2],this}toArray(J=[],$=0){return J[$]=this.x,J[$+1]=this.y,J[$+2]=this.z,J}fromBufferAttribute(J,$){return this.x=J.getX($),this.y=J.getY($),this.z=J.getZ($),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let J=Math.random()*Math.PI*2,$=Math.random()*2-1,Q=Math.sqrt(1-$*$);return this.x=Q*Math.cos(J),this.y=$,this.z=Q*Math.sin(J),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}var T8=new A,t9=new P6;class n0{constructor(J=new A(1/0,1/0,1/0),$=new A(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=J,this.max=$}set(J,$){return this.min.copy(J),this.max.copy($),this}setFromArray(J){this.makeEmpty();for(let $=0,Q=J.length;$<Q;$+=3)this.expandByPoint(h0.fromArray(J,$));return this}setFromBufferAttribute(J){this.makeEmpty();for(let $=0,Q=J.count;$<Q;$++)this.expandByPoint(h0.fromBufferAttribute(J,$));return this}setFromPoints(J){this.makeEmpty();for(let $=0,Q=J.length;$<Q;$++)this.expandByPoint(J[$]);return this}setFromCenterAndSize(J,$){let Q=h0.copy($).multiplyScalar(0.5);return this.min.copy(J).sub(Q),this.max.copy(J).add(Q),this}setFromObject(J,$=!1){return this.makeEmpty(),this.expandByObject(J,$)}clone(){return new this.constructor().copy(this)}copy(J){return this.min.copy(J.min),this.max.copy(J.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(J){return this.isEmpty()?J.set(0,0,0):J.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(J){return this.isEmpty()?J.set(0,0,0):J.subVectors(this.max,this.min)}expandByPoint(J){return this.min.min(J),this.max.max(J),this}expandByVector(J){return this.min.sub(J),this.max.add(J),this}expandByScalar(J){return this.min.addScalar(-J),this.max.addScalar(J),this}expandByObject(J,$=!1){J.updateWorldMatrix(!1,!1);let Q=J.geometry;if(Q!==void 0){let W=Q.getAttribute("position");if($===!0&&W!==void 0&&J.isInstancedMesh!==!0)for(let Y=0,K=W.count;Y<K;Y++){if(J.isMesh===!0)J.getVertexPosition(Y,h0);else h0.fromBufferAttribute(W,Y);h0.applyMatrix4(J.matrixWorld),this.expandByPoint(h0)}else{if(J.boundingBox!==void 0){if(J.boundingBox===null)J.computeBoundingBox();y7.copy(J.boundingBox)}else{if(Q.boundingBox===null)Q.computeBoundingBox();y7.copy(Q.boundingBox)}y7.applyMatrix4(J.matrixWorld),this.union(y7)}}let Z=J.children;for(let W=0,Y=Z.length;W<Y;W++)this.expandByObject(Z[W],$);return this}containsPoint(J){return J.x>=this.min.x&&J.x<=this.max.x&&J.y>=this.min.y&&J.y<=this.max.y&&J.z>=this.min.z&&J.z<=this.max.z}containsBox(J){return this.min.x<=J.min.x&&J.max.x<=this.max.x&&this.min.y<=J.min.y&&J.max.y<=this.max.y&&this.min.z<=J.min.z&&J.max.z<=this.max.z}getParameter(J,$){return $.set((J.x-this.min.x)/(this.max.x-this.min.x),(J.y-this.min.y)/(this.max.y-this.min.y),(J.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(J){return J.max.x>=this.min.x&&J.min.x<=this.max.x&&J.max.y>=this.min.y&&J.min.y<=this.max.y&&J.max.z>=this.min.z&&J.min.z<=this.max.z}intersectsSphere(J){return this.clampPoint(J.center,h0),h0.distanceToSquared(J.center)<=J.radius*J.radius}intersectsPlane(J){let $,Q;if(J.normal.x>0)$=J.normal.x*this.min.x,Q=J.normal.x*this.max.x;else $=J.normal.x*this.max.x,Q=J.normal.x*this.min.x;if(J.normal.y>0)$+=J.normal.y*this.min.y,Q+=J.normal.y*this.max.y;else $+=J.normal.y*this.max.y,Q+=J.normal.y*this.min.y;if(J.normal.z>0)$+=J.normal.z*this.min.z,Q+=J.normal.z*this.max.z;else $+=J.normal.z*this.max.z,Q+=J.normal.z*this.min.z;return $<=-J.constant&&Q>=-J.constant}intersectsTriangle(J){if(this.isEmpty())return!1;this.getCenter(V7),f7.subVectors(this.max,V7),h6.subVectors(J.a,V7),x6.subVectors(J.b,V7),b6.subVectors(J.c,V7),q6.subVectors(x6,h6),V6.subVectors(b6,x6),L6.subVectors(h6,b6);let $=[0,-q6.z,q6.y,0,-V6.z,V6.y,0,-L6.z,L6.y,q6.z,0,-q6.x,V6.z,0,-V6.x,L6.z,0,-L6.x,-q6.y,q6.x,0,-V6.y,V6.x,0,-L6.y,L6.x,0];if(!P8($,h6,x6,b6,f7))return!1;if($=[1,0,0,0,1,0,0,0,1],!P8($,h6,x6,b6,f7))return!1;return h7.crossVectors(q6,V6),$=[h7.x,h7.y,h7.z],P8($,h6,x6,b6,f7)}clampPoint(J,$){return $.copy(J).clamp(this.min,this.max)}distanceToPoint(J){return this.clampPoint(J,h0).distanceTo(J)}getBoundingSphere(J){if(this.isEmpty())J.makeEmpty();else this.getCenter(J.center),J.radius=this.getSize(h0).length()*0.5;return J}intersect(J){if(this.min.max(J.min),this.max.min(J.max),this.isEmpty())this.makeEmpty();return this}union(J){return this.min.min(J.min),this.max.max(J.max),this}applyMatrix4(J){if(this.isEmpty())return this;return r0[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(J),r0[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(J),r0[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(J),r0[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(J),r0[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(J),r0[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(J),r0[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(J),r0[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(J),this.setFromPoints(r0),this}translate(J){return this.min.add(J),this.max.add(J),this}equals(J){return J.min.equals(this.min)&&J.max.equals(this.max)}}var r0=[new A,new A,new A,new A,new A,new A,new A,new A],h0=new A,y7=new n0,h6=new A,x6=new A,b6=new A,q6=new A,V6=new A,L6=new A,V7=new A,f7=new A,h7=new A,z6=new A;function P8(J,$,Q,Z,W){for(let Y=0,K=J.length-3;Y<=K;Y+=3){z6.fromArray(J,Y);let X=W.x*Math.abs(z6.x)+W.y*Math.abs(z6.y)+W.z*Math.abs(z6.z),U=$.dot(z6),H=Q.dot(z6),G=Z.dot(z6);if(Math.max(-Math.max(U,H,G),Math.min(U,H,G))>X)return!1}return!0}var KQ=new n0,E7=new A,S8=new A;class Q7{constructor(J=new A,$=-1){this.isSphere=!0,this.center=J,this.radius=$}set(J,$){return this.center.copy(J),this.radius=$,this}setFromPoints(J,$){let Q=this.center;if($!==void 0)Q.copy($);else KQ.setFromPoints(J).getCenter(Q);let Z=0;for(let W=0,Y=J.length;W<Y;W++)Z=Math.max(Z,Q.distanceToSquared(J[W]));return this.radius=Math.sqrt(Z),this}copy(J){return this.center.copy(J.center),this.radius=J.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(J){return J.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(J){return J.distanceTo(this.center)-this.radius}intersectsSphere(J){let $=this.radius+J.radius;return J.center.distanceToSquared(this.center)<=$*$}intersectsBox(J){return J.intersectsSphere(this)}intersectsPlane(J){return Math.abs(J.distanceToPoint(this.center))<=this.radius}clampPoint(J,$){let Q=this.center.distanceToSquared(J);if($.copy(J),Q>this.radius*this.radius)$.sub(this.center).normalize(),$.multiplyScalar(this.radius).add(this.center);return $}getBoundingBox(J){if(this.isEmpty())return J.makeEmpty(),J;return J.set(this.center,this.center),J.expandByScalar(this.radius),J}applyMatrix4(J){return this.center.applyMatrix4(J),this.radius=this.radius*J.getMaxScaleOnAxis(),this}translate(J){return this.center.add(J),this}expandByPoint(J){if(this.isEmpty())return this.center.copy(J),this.radius=0,this;E7.subVectors(J,this.center);let $=E7.lengthSq();if($>this.radius*this.radius){let Q=Math.sqrt($),Z=(Q-this.radius)*0.5;this.center.addScaledVector(E7,Z/Q),this.radius+=Z}return this}union(J){if(J.isEmpty())return this;if(this.isEmpty())return this.copy(J),this;if(this.center.equals(J.center)===!0)this.radius=Math.max(this.radius,J.radius);else S8.subVectors(J.center,this.center).setLength(J.radius),this.expandByPoint(E7.copy(J.center).add(S8)),this.expandByPoint(E7.copy(J.center).sub(S8));return this}equals(J){return J.center.equals(this.center)&&J.radius===this.radius}clone(){return new this.constructor().copy(this)}}var t0=new A,v8=new A,x7=new A,E6=new A,j8=new A,b7=new A,y8=new A;class G9{constructor(J=new A,$=new A(0,0,-1)){this.origin=J,this.direction=$}set(J,$){return this.origin.copy(J),this.direction.copy($),this}copy(J){return this.origin.copy(J.origin),this.direction.copy(J.direction),this}at(J,$){return $.copy(this.origin).addScaledVector(this.direction,J)}lookAt(J){return this.direction.copy(J).sub(this.origin).normalize(),this}recast(J){return this.origin.copy(this.at(J,t0)),this}closestPointToPoint(J,$){$.subVectors(J,this.origin);let Q=$.dot(this.direction);if(Q<0)return $.copy(this.origin);return $.copy(this.origin).addScaledVector(this.direction,Q)}distanceToPoint(J){return Math.sqrt(this.distanceSqToPoint(J))}distanceSqToPoint(J){let $=t0.subVectors(J,this.origin).dot(this.direction);if($<0)return this.origin.distanceToSquared(J);return t0.copy(this.origin).addScaledVector(this.direction,$),t0.distanceToSquared(J)}distanceSqToSegment(J,$,Q,Z){v8.copy(J).add($).multiplyScalar(0.5),x7.copy($).sub(J).normalize(),E6.copy(this.origin).sub(v8);let W=J.distanceTo($)*0.5,Y=-this.direction.dot(x7),K=E6.dot(this.direction),X=-E6.dot(x7),U=E6.lengthSq(),H=Math.abs(1-Y*Y),G,V,q,D;if(H>0)if(G=Y*X-K,V=Y*K-X,D=W*H,G>=0)if(V>=-D)if(V<=D){let O=1/H;G*=O,V*=O,q=G*(G+Y*V+2*K)+V*(Y*G+V+2*X)+U}else V=W,G=Math.max(0,-(Y*V+K)),q=-G*G+V*(V+2*X)+U;else V=-W,G=Math.max(0,-(Y*V+K)),q=-G*G+V*(V+2*X)+U;else if(V<=-D)G=Math.max(0,-(-Y*W+K)),V=G>0?-W:Math.min(Math.max(-W,-X),W),q=-G*G+V*(V+2*X)+U;else if(V<=D)G=0,V=Math.min(Math.max(-W,-X),W),q=V*(V+2*X)+U;else G=Math.max(0,-(Y*W+K)),V=G>0?W:Math.min(Math.max(-W,-X),W),q=-G*G+V*(V+2*X)+U;else V=Y>0?-W:W,G=Math.max(0,-(Y*V+K)),q=-G*G+V*(V+2*X)+U;if(Q)Q.copy(this.origin).addScaledVector(this.direction,G);if(Z)Z.copy(v8).addScaledVector(x7,V);return q}intersectSphere(J,$){t0.subVectors(J.center,this.origin);let Q=t0.dot(this.direction),Z=t0.dot(t0)-Q*Q,W=J.radius*J.radius;if(Z>W)return null;let Y=Math.sqrt(W-Z),K=Q-Y,X=Q+Y;if(X<0)return null;if(K<0)return this.at(X,$);return this.at(K,$)}intersectsSphere(J){return this.distanceSqToPoint(J.center)<=J.radius*J.radius}distanceToPlane(J){let $=J.normal.dot(this.direction);if($===0){if(J.distanceToPoint(this.origin)===0)return 0;return null}let Q=-(this.origin.dot(J.normal)+J.constant)/$;return Q>=0?Q:null}intersectPlane(J,$){let Q=this.distanceToPlane(J);if(Q===null)return null;return this.at(Q,$)}intersectsPlane(J){let $=J.distanceToPoint(this.origin);if($===0)return!0;if(J.normal.dot(this.direction)*$<0)return!0;return!1}intersectBox(J,$){let Q,Z,W,Y,K,X,U=1/this.direction.x,H=1/this.direction.y,G=1/this.direction.z,V=this.origin;if(U>=0)Q=(J.min.x-V.x)*U,Z=(J.max.x-V.x)*U;else Q=(J.max.x-V.x)*U,Z=(J.min.x-V.x)*U;if(H>=0)W=(J.min.y-V.y)*H,Y=(J.max.y-V.y)*H;else W=(J.max.y-V.y)*H,Y=(J.min.y-V.y)*H;if(Q>Y||W>Z)return null;if(W>Q||isNaN(Q))Q=W;if(Y<Z||isNaN(Z))Z=Y;if(G>=0)K=(J.min.z-V.z)*G,X=(J.max.z-V.z)*G;else K=(J.max.z-V.z)*G,X=(J.min.z-V.z)*G;if(Q>X||K>Z)return null;if(K>Q||Q!==Q)Q=K;if(X<Z||Z!==Z)Z=X;if(Z<0)return null;return this.at(Q>=0?Q:Z,$)}intersectsBox(J){return this.intersectBox(J,t0)!==null}intersectTriangle(J,$,Q,Z,W){j8.subVectors($,J),b7.subVectors(Q,J),y8.crossVectors(j8,b7);let Y=this.direction.dot(y8),K;if(Y>0){if(Z)return null;K=1}else if(Y<0)K=-1,Y=-Y;else return null;E6.subVectors(this.origin,J);let X=K*this.direction.dot(b7.crossVectors(E6,b7));if(X<0)return null;let U=K*this.direction.dot(j8.cross(E6));if(U<0)return null;if(X+U>Y)return null;let H=-K*E6.dot(y8);if(H<0)return null;return this.at(H/Y,W)}applyMatrix4(J){return this.origin.applyMatrix4(J),this.direction.transformDirection(J),this}equals(J){return J.origin.equals(this.origin)&&J.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Q0{constructor(J,$,Q,Z,W,Y,K,X,U,H,G,V,q,D,O,M){if(Q0.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],J!==void 0)this.set(J,$,Q,Z,W,Y,K,X,U,H,G,V,q,D,O,M)}set(J,$,Q,Z,W,Y,K,X,U,H,G,V,q,D,O,M){let F=this.elements;return F[0]=J,F[4]=$,F[8]=Q,F[12]=Z,F[1]=W,F[5]=Y,F[9]=K,F[13]=X,F[2]=U,F[6]=H,F[10]=G,F[14]=V,F[3]=q,F[7]=D,F[11]=O,F[15]=M,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Q0().fromArray(this.elements)}copy(J){let $=this.elements,Q=J.elements;return $[0]=Q[0],$[1]=Q[1],$[2]=Q[2],$[3]=Q[3],$[4]=Q[4],$[5]=Q[5],$[6]=Q[6],$[7]=Q[7],$[8]=Q[8],$[9]=Q[9],$[10]=Q[10],$[11]=Q[11],$[12]=Q[12],$[13]=Q[13],$[14]=Q[14],$[15]=Q[15],this}copyPosition(J){let $=this.elements,Q=J.elements;return $[12]=Q[12],$[13]=Q[13],$[14]=Q[14],this}setFromMatrix3(J){let $=J.elements;return this.set($[0],$[3],$[6],0,$[1],$[4],$[7],0,$[2],$[5],$[8],0,0,0,0,1),this}extractBasis(J,$,Q){return J.setFromMatrixColumn(this,0),$.setFromMatrixColumn(this,1),Q.setFromMatrixColumn(this,2),this}makeBasis(J,$,Q){return this.set(J.x,$.x,Q.x,0,J.y,$.y,Q.y,0,J.z,$.z,Q.z,0,0,0,0,1),this}extractRotation(J){let $=this.elements,Q=J.elements,Z=1/g6.setFromMatrixColumn(J,0).length(),W=1/g6.setFromMatrixColumn(J,1).length(),Y=1/g6.setFromMatrixColumn(J,2).length();return $[0]=Q[0]*Z,$[1]=Q[1]*Z,$[2]=Q[2]*Z,$[3]=0,$[4]=Q[4]*W,$[5]=Q[5]*W,$[6]=Q[6]*W,$[7]=0,$[8]=Q[8]*Y,$[9]=Q[9]*Y,$[10]=Q[10]*Y,$[11]=0,$[12]=0,$[13]=0,$[14]=0,$[15]=1,this}makeRotationFromEuler(J){let $=this.elements,Q=J.x,Z=J.y,W=J.z,Y=Math.cos(Q),K=Math.sin(Q),X=Math.cos(Z),U=Math.sin(Z),H=Math.cos(W),G=Math.sin(W);if(J.order==="XYZ"){let V=Y*H,q=Y*G,D=K*H,O=K*G;$[0]=X*H,$[4]=-X*G,$[8]=U,$[1]=q+D*U,$[5]=V-O*U,$[9]=-K*X,$[2]=O-V*U,$[6]=D+q*U,$[10]=Y*X}else if(J.order==="YXZ"){let V=X*H,q=X*G,D=U*H,O=U*G;$[0]=V+O*K,$[4]=D*K-q,$[8]=Y*U,$[1]=Y*G,$[5]=Y*H,$[9]=-K,$[2]=q*K-D,$[6]=O+V*K,$[10]=Y*X}else if(J.order==="ZXY"){let V=X*H,q=X*G,D=U*H,O=U*G;$[0]=V-O*K,$[4]=-Y*G,$[8]=D+q*K,$[1]=q+D*K,$[5]=Y*H,$[9]=O-V*K,$[2]=-Y*U,$[6]=K,$[10]=Y*X}else if(J.order==="ZYX"){let V=Y*H,q=Y*G,D=K*H,O=K*G;$[0]=X*H,$[4]=D*U-q,$[8]=V*U+O,$[1]=X*G,$[5]=O*U+V,$[9]=q*U-D,$[2]=-U,$[6]=K*X,$[10]=Y*X}else if(J.order==="YZX"){let V=Y*X,q=Y*U,D=K*X,O=K*U;$[0]=X*H,$[4]=O-V*G,$[8]=D*G+q,$[1]=G,$[5]=Y*H,$[9]=-K*H,$[2]=-U*H,$[6]=q*G+D,$[10]=V-O*G}else if(J.order==="XZY"){let V=Y*X,q=Y*U,D=K*X,O=K*U;$[0]=X*H,$[4]=-G,$[8]=U*H,$[1]=V*G+O,$[5]=Y*H,$[9]=q*G-D,$[2]=D*G-q,$[6]=K*H,$[10]=O*G+V}return $[3]=0,$[7]=0,$[11]=0,$[12]=0,$[13]=0,$[14]=0,$[15]=1,this}makeRotationFromQuaternion(J){return this.compose(XQ,J,UQ)}lookAt(J,$,Q){let Z=this.elements;if(T0.subVectors(J,$),T0.lengthSq()===0)T0.z=1;if(T0.normalize(),F6.crossVectors(Q,T0),F6.lengthSq()===0){if(Math.abs(Q.z)===1)T0.x+=0.0001;else T0.z+=0.0001;T0.normalize(),F6.crossVectors(Q,T0)}return F6.normalize(),g7.crossVectors(T0,F6),Z[0]=F6.x,Z[4]=g7.x,Z[8]=T0.x,Z[1]=F6.y,Z[5]=g7.y,Z[9]=T0.y,Z[2]=F6.z,Z[6]=g7.z,Z[10]=T0.z,this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,$){let Q=J.elements,Z=$.elements,W=this.elements,Y=Q[0],K=Q[4],X=Q[8],U=Q[12],H=Q[1],G=Q[5],V=Q[9],q=Q[13],D=Q[2],O=Q[6],M=Q[10],F=Q[14],E=Q[3],z=Q[7],N=Q[11],k=Q[15],f=Z[0],w=Z[4],I=Z[8],x=Z[12],L=Z[1],_=Z[5],P=Z[9],l=Z[13],m=Z[2],d=Z[6],t=Z[10],g=Z[14],e=Z[3],u=Z[7],WJ=Z[11],HJ=Z[15];return W[0]=Y*f+K*L+X*m+U*e,W[4]=Y*w+K*_+X*d+U*u,W[8]=Y*I+K*P+X*t+U*WJ,W[12]=Y*x+K*l+X*g+U*HJ,W[1]=H*f+G*L+V*m+q*e,W[5]=H*w+G*_+V*d+q*u,W[9]=H*I+G*P+V*t+q*WJ,W[13]=H*x+G*l+V*g+q*HJ,W[2]=D*f+O*L+M*m+F*e,W[6]=D*w+O*_+M*d+F*u,W[10]=D*I+O*P+M*t+F*WJ,W[14]=D*x+O*l+M*g+F*HJ,W[3]=E*f+z*L+N*m+k*e,W[7]=E*w+z*_+N*d+k*u,W[11]=E*I+z*P+N*t+k*WJ,W[15]=E*x+z*l+N*g+k*HJ,this}multiplyScalar(J){let $=this.elements;return $[0]*=J,$[4]*=J,$[8]*=J,$[12]*=J,$[1]*=J,$[5]*=J,$[9]*=J,$[13]*=J,$[2]*=J,$[6]*=J,$[10]*=J,$[14]*=J,$[3]*=J,$[7]*=J,$[11]*=J,$[15]*=J,this}determinant(){let J=this.elements,$=J[0],Q=J[4],Z=J[8],W=J[12],Y=J[1],K=J[5],X=J[9],U=J[13],H=J[2],G=J[6],V=J[10],q=J[14],D=J[3],O=J[7],M=J[11],F=J[15];return D*(+W*X*G-Z*U*G-W*K*V+Q*U*V+Z*K*q-Q*X*q)+O*(+$*X*q-$*U*V+W*Y*V-Z*Y*q+Z*U*H-W*X*H)+M*(+$*U*G-$*K*q-W*Y*G+Q*Y*q+W*K*H-Q*U*H)+F*(-Z*K*H-$*X*G+$*K*V+Z*Y*G-Q*Y*V+Q*X*H)}transpose(){let J=this.elements,$;return $=J[1],J[1]=J[4],J[4]=$,$=J[2],J[2]=J[8],J[8]=$,$=J[6],J[6]=J[9],J[9]=$,$=J[3],J[3]=J[12],J[12]=$,$=J[7],J[7]=J[13],J[13]=$,$=J[11],J[11]=J[14],J[14]=$,this}setPosition(J,$,Q){let Z=this.elements;if(J.isVector3)Z[12]=J.x,Z[13]=J.y,Z[14]=J.z;else Z[12]=J,Z[13]=$,Z[14]=Q;return this}invert(){let J=this.elements,$=J[0],Q=J[1],Z=J[2],W=J[3],Y=J[4],K=J[5],X=J[6],U=J[7],H=J[8],G=J[9],V=J[10],q=J[11],D=J[12],O=J[13],M=J[14],F=J[15],E=G*M*U-O*V*U+O*X*q-K*M*q-G*X*F+K*V*F,z=D*V*U-H*M*U-D*X*q+Y*M*q+H*X*F-Y*V*F,N=H*O*U-D*G*U+D*K*q-Y*O*q-H*K*F+Y*G*F,k=D*G*X-H*O*X-D*K*V+Y*O*V+H*K*M-Y*G*M,f=$*E+Q*z+Z*N+W*k;if(f===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let w=1/f;return J[0]=E*w,J[1]=(O*V*W-G*M*W-O*Z*q+Q*M*q+G*Z*F-Q*V*F)*w,J[2]=(K*M*W-O*X*W+O*Z*U-Q*M*U-K*Z*F+Q*X*F)*w,J[3]=(G*X*W-K*V*W-G*Z*U+Q*V*U+K*Z*q-Q*X*q)*w,J[4]=z*w,J[5]=(H*M*W-D*V*W+D*Z*q-$*M*q-H*Z*F+$*V*F)*w,J[6]=(D*X*W-Y*M*W-D*Z*U+$*M*U+Y*Z*F-$*X*F)*w,J[7]=(Y*V*W-H*X*W+H*Z*U-$*V*U-Y*Z*q+$*X*q)*w,J[8]=N*w,J[9]=(D*G*W-H*O*W-D*Q*q+$*O*q+H*Q*F-$*G*F)*w,J[10]=(Y*O*W-D*K*W+D*Q*U-$*O*U-Y*Q*F+$*K*F)*w,J[11]=(H*K*W-Y*G*W-H*Q*U+$*G*U+Y*Q*q-$*K*q)*w,J[12]=k*w,J[13]=(H*O*Z-D*G*Z+D*Q*V-$*O*V-H*Q*M+$*G*M)*w,J[14]=(D*K*Z-Y*O*Z-D*Q*X+$*O*X+Y*Q*M-$*K*M)*w,J[15]=(Y*G*Z-H*K*Z+H*Q*X-$*G*X-Y*Q*V+$*K*V)*w,this}scale(J){let $=this.elements,Q=J.x,Z=J.y,W=J.z;return $[0]*=Q,$[4]*=Z,$[8]*=W,$[1]*=Q,$[5]*=Z,$[9]*=W,$[2]*=Q,$[6]*=Z,$[10]*=W,$[3]*=Q,$[7]*=Z,$[11]*=W,this}getMaxScaleOnAxis(){let J=this.elements,$=J[0]*J[0]+J[1]*J[1]+J[2]*J[2],Q=J[4]*J[4]+J[5]*J[5]+J[6]*J[6],Z=J[8]*J[8]+J[9]*J[9]+J[10]*J[10];return Math.sqrt(Math.max($,Q,Z))}makeTranslation(J,$,Q){if(J.isVector3)this.set(1,0,0,J.x,0,1,0,J.y,0,0,1,J.z,0,0,0,1);else this.set(1,0,0,J,0,1,0,$,0,0,1,Q,0,0,0,1);return this}makeRotationX(J){let $=Math.cos(J),Q=Math.sin(J);return this.set(1,0,0,0,0,$,-Q,0,0,Q,$,0,0,0,0,1),this}makeRotationY(J){let $=Math.cos(J),Q=Math.sin(J);return this.set($,0,Q,0,0,1,0,0,-Q,0,$,0,0,0,0,1),this}makeRotationZ(J){let $=Math.cos(J),Q=Math.sin(J);return this.set($,-Q,0,0,Q,$,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(J,$){let Q=Math.cos($),Z=Math.sin($),W=1-Q,Y=J.x,K=J.y,X=J.z,U=W*Y,H=W*K;return this.set(U*Y+Q,U*K-Z*X,U*X+Z*K,0,U*K+Z*X,H*K+Q,H*X-Z*Y,0,U*X-Z*K,H*X+Z*Y,W*X*X+Q,0,0,0,0,1),this}makeScale(J,$,Q){return this.set(J,0,0,0,0,$,0,0,0,0,Q,0,0,0,0,1),this}makeShear(J,$,Q,Z,W,Y){return this.set(1,Q,W,0,J,1,Y,0,$,Z,1,0,0,0,0,1),this}compose(J,$,Q){let Z=this.elements,W=$._x,Y=$._y,K=$._z,X=$._w,U=W+W,H=Y+Y,G=K+K,V=W*U,q=W*H,D=W*G,O=Y*H,M=Y*G,F=K*G,E=X*U,z=X*H,N=X*G,k=Q.x,f=Q.y,w=Q.z;return Z[0]=(1-(O+F))*k,Z[1]=(q+N)*k,Z[2]=(D-z)*k,Z[3]=0,Z[4]=(q-N)*f,Z[5]=(1-(V+F))*f,Z[6]=(M+E)*f,Z[7]=0,Z[8]=(D+z)*w,Z[9]=(M-E)*w,Z[10]=(1-(V+O))*w,Z[11]=0,Z[12]=J.x,Z[13]=J.y,Z[14]=J.z,Z[15]=1,this}decompose(J,$,Q){let Z=this.elements,W=g6.set(Z[0],Z[1],Z[2]).length(),Y=g6.set(Z[4],Z[5],Z[6]).length(),K=g6.set(Z[8],Z[9],Z[10]).length();if(this.determinant()<0)W=-W;J.x=Z[12],J.y=Z[13],J.z=Z[14],x0.copy(this);let U=1/W,H=1/Y,G=1/K;return x0.elements[0]*=U,x0.elements[1]*=U,x0.elements[2]*=U,x0.elements[4]*=H,x0.elements[5]*=H,x0.elements[6]*=H,x0.elements[8]*=G,x0.elements[9]*=G,x0.elements[10]*=G,$.setFromRotationMatrix(x0),Q.x=W,Q.y=Y,Q.z=K,this}makePerspective(J,$,Q,Z,W,Y,K=2000){let X=this.elements,U=2*W/($-J),H=2*W/(Q-Z),G=($+J)/($-J),V=(Q+Z)/(Q-Z),q,D;if(K===2000)q=-(Y+W)/(Y-W),D=-2*Y*W/(Y-W);else if(K===2001)q=-Y/(Y-W),D=-Y*W/(Y-W);else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+K);return X[0]=U,X[4]=0,X[8]=G,X[12]=0,X[1]=0,X[5]=H,X[9]=V,X[13]=0,X[2]=0,X[6]=0,X[10]=q,X[14]=D,X[3]=0,X[7]=0,X[11]=-1,X[15]=0,this}makeOrthographic(J,$,Q,Z,W,Y,K=2000){let X=this.elements,U=1/($-J),H=1/(Q-Z),G=1/(Y-W),V=($+J)*U,q=(Q+Z)*H,D,O;if(K===2000)D=(Y+W)*G,O=-2*G;else if(K===2001)D=W*G,O=-1*G;else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+K);return X[0]=2*U,X[4]=0,X[8]=0,X[12]=-V,X[1]=0,X[5]=2*H,X[9]=0,X[13]=-q,X[2]=0,X[6]=0,X[10]=O,X[14]=-D,X[3]=0,X[7]=0,X[11]=0,X[15]=1,this}equals(J){let $=this.elements,Q=J.elements;for(let Z=0;Z<16;Z++)if($[Z]!==Q[Z])return!1;return!0}fromArray(J,$=0){for(let Q=0;Q<16;Q++)this.elements[Q]=J[Q+$];return this}toArray(J=[],$=0){let Q=this.elements;return J[$]=Q[0],J[$+1]=Q[1],J[$+2]=Q[2],J[$+3]=Q[3],J[$+4]=Q[4],J[$+5]=Q[5],J[$+6]=Q[6],J[$+7]=Q[7],J[$+8]=Q[8],J[$+9]=Q[9],J[$+10]=Q[10],J[$+11]=Q[11],J[$+12]=Q[12],J[$+13]=Q[13],J[$+14]=Q[14],J[$+15]=Q[15],J}}var g6=new A,x0=new Q0,XQ=new A(0,0,0),UQ=new A(1,1,1),F6=new A,g7=new A,T0=new A,e9=new Q0,J5=new P6;class c0{constructor(J=0,$=0,Q=0,Z=c0.DEFAULT_ORDER){this.isEuler=!0,this._x=J,this._y=$,this._z=Q,this._order=Z}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get order(){return this._order}set order(J){this._order=J,this._onChangeCallback()}set(J,$,Q,Z=this._order){return this._x=J,this._y=$,this._z=Q,this._order=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(J){return this._x=J._x,this._y=J._y,this._z=J._z,this._order=J._order,this._onChangeCallback(),this}setFromRotationMatrix(J,$=this._order,Q=!0){let Z=J.elements,W=Z[0],Y=Z[4],K=Z[8],X=Z[1],U=Z[5],H=Z[9],G=Z[2],V=Z[6],q=Z[10];switch($){case"XYZ":if(this._y=Math.asin(B0(K,-1,1)),Math.abs(K)<0.9999999)this._x=Math.atan2(-H,q),this._z=Math.atan2(-Y,W);else this._x=Math.atan2(V,U),this._z=0;break;case"YXZ":if(this._x=Math.asin(-B0(H,-1,1)),Math.abs(H)<0.9999999)this._y=Math.atan2(K,q),this._z=Math.atan2(X,U);else this._y=Math.atan2(-G,W),this._z=0;break;case"ZXY":if(this._x=Math.asin(B0(V,-1,1)),Math.abs(V)<0.9999999)this._y=Math.atan2(-G,q),this._z=Math.atan2(-Y,U);else this._y=0,this._z=Math.atan2(X,W);break;case"ZYX":if(this._y=Math.asin(-B0(G,-1,1)),Math.abs(G)<0.9999999)this._x=Math.atan2(V,q),this._z=Math.atan2(X,W);else this._x=0,this._z=Math.atan2(-Y,U);break;case"YZX":if(this._z=Math.asin(B0(X,-1,1)),Math.abs(X)<0.9999999)this._x=Math.atan2(-H,U),this._y=Math.atan2(-G,W);else this._x=0,this._y=Math.atan2(K,q);break;case"XZY":if(this._z=Math.asin(-B0(Y,-1,1)),Math.abs(Y)<0.9999999)this._x=Math.atan2(V,U),this._y=Math.atan2(K,W);else this._x=Math.atan2(-H,q),this._y=0;break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+$)}if(this._order=$,Q===!0)this._onChangeCallback();return this}setFromQuaternion(J,$,Q){return e9.makeRotationFromQuaternion(J),this.setFromRotationMatrix(e9,$,Q)}setFromVector3(J,$=this._order){return this.set(J.x,J.y,J.z,$)}reorder(J){return J5.setFromEuler(this),this.setFromQuaternion(J5,J)}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._order===this._order}fromArray(J){if(this._x=J[0],this._y=J[1],this._z=J[2],J[3]!==void 0)this._order=J[3];return this._onChangeCallback(),this}toArray(J=[],$=0){return J[$]=this._x,J[$+1]=this._y,J[$+2]=this._z,J[$+3]=this._order,J}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}c0.DEFAULT_ORDER="XYZ";class G8{constructor(){this.mask=1}set(J){this.mask=(1<<J|0)>>>0}enable(J){this.mask|=1<<J|0}enableAll(){this.mask=-1}toggle(J){this.mask^=1<<J|0}disable(J){this.mask&=~(1<<J|0)}disableAll(){this.mask=0}test(J){return(this.mask&J.mask)!==0}isEnabled(J){return(this.mask&(1<<J|0))!==0}}var HQ=0,$5=new A,p6=new P6,e0=new Q0,p7=new A,F7=new A,GQ=new A,qQ=new P6,Q5=new A(1,0,0),Z5=new A(0,1,0),W5=new A(0,0,1),Y5={type:"added"},VQ={type:"removed"},l6={type:"childadded",child:null},f8={type:"childremoved",child:null};class q0 extends T6{constructor(){super();this.isObject3D=!0,Object.defineProperty(this,"id",{value:HQ++}),this.uuid=O6(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=q0.DEFAULT_UP.clone();let J=new A,$=new c0,Q=new P6,Z=new A(1,1,1);function W(){Q.setFromEuler($,!1)}function Y(){$.setFromQuaternion(Q,void 0,!1)}$._onChange(W),Q._onChange(Y),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:J},rotation:{configurable:!0,enumerable:!0,value:$},quaternion:{configurable:!0,enumerable:!0,value:Q},scale:{configurable:!0,enumerable:!0,value:Z},modelViewMatrix:{value:new Q0},normalMatrix:{value:new lJ}}),this.matrix=new Q0,this.matrixWorld=new Q0,this.matrixAutoUpdate=q0.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=q0.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new G8,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(J){if(this.matrixAutoUpdate)this.updateMatrix();this.matrix.premultiply(J),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(J){return this.quaternion.premultiply(J),this}setRotationFromAxisAngle(J,$){this.quaternion.setFromAxisAngle(J,$)}setRotationFromEuler(J){this.quaternion.setFromEuler(J,!0)}setRotationFromMatrix(J){this.quaternion.setFromRotationMatrix(J)}setRotationFromQuaternion(J){this.quaternion.copy(J)}rotateOnAxis(J,$){return p6.setFromAxisAngle(J,$),this.quaternion.multiply(p6),this}rotateOnWorldAxis(J,$){return p6.setFromAxisAngle(J,$),this.quaternion.premultiply(p6),this}rotateX(J){return this.rotateOnAxis(Q5,J)}rotateY(J){return this.rotateOnAxis(Z5,J)}rotateZ(J){return this.rotateOnAxis(W5,J)}translateOnAxis(J,$){return $5.copy(J).applyQuaternion(this.quaternion),this.position.add($5.multiplyScalar($)),this}translateX(J){return this.translateOnAxis(Q5,J)}translateY(J){return this.translateOnAxis(Z5,J)}translateZ(J){return this.translateOnAxis(W5,J)}localToWorld(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(this.matrixWorld)}worldToLocal(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(e0.copy(this.matrixWorld).invert())}lookAt(J,$,Q){if(J.isVector3)p7.copy(J);else p7.set(J,$,Q);let Z=this.parent;if(this.updateWorldMatrix(!0,!1),F7.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight)e0.lookAt(F7,p7,this.up);else e0.lookAt(p7,F7,this.up);if(this.quaternion.setFromRotationMatrix(e0),Z)e0.extractRotation(Z.matrixWorld),p6.setFromRotationMatrix(e0),this.quaternion.premultiply(p6.invert())}add(J){if(arguments.length>1){for(let $=0;$<arguments.length;$++)this.add(arguments[$]);return this}if(J===this)return console.error("THREE.Object3D.add: object can't be added as a child of itself.",J),this;if(J&&J.isObject3D)J.removeFromParent(),J.parent=this,this.children.push(J),J.dispatchEvent(Y5),l6.child=J,this.dispatchEvent(l6),l6.child=null;else console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",J);return this}remove(J){if(arguments.length>1){for(let Q=0;Q<arguments.length;Q++)this.remove(arguments[Q]);return this}let $=this.children.indexOf(J);if($!==-1)J.parent=null,this.children.splice($,1),J.dispatchEvent(VQ),f8.child=J,this.dispatchEvent(f8),f8.child=null;return this}removeFromParent(){let J=this.parent;if(J!==null)J.remove(this);return this}clear(){return this.remove(...this.children)}attach(J){if(this.updateWorldMatrix(!0,!1),e0.copy(this.matrixWorld).invert(),J.parent!==null)J.parent.updateWorldMatrix(!0,!1),e0.multiply(J.parent.matrixWorld);return J.applyMatrix4(e0),J.removeFromParent(),J.parent=this,this.children.push(J),J.updateWorldMatrix(!1,!0),J.dispatchEvent(Y5),l6.child=J,this.dispatchEvent(l6),l6.child=null,this}getObjectById(J){return this.getObjectByProperty("id",J)}getObjectByName(J){return this.getObjectByProperty("name",J)}getObjectByProperty(J,$){if(this[J]===$)return this;for(let Q=0,Z=this.children.length;Q<Z;Q++){let Y=this.children[Q].getObjectByProperty(J,$);if(Y!==void 0)return Y}return}getObjectsByProperty(J,$,Q=[]){if(this[J]===$)Q.push(this);let Z=this.children;for(let W=0,Y=Z.length;W<Y;W++)Z[W].getObjectsByProperty(J,$,Q);return Q}getWorldPosition(J){return this.updateWorldMatrix(!0,!1),J.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(F7,J,GQ),J}getWorldScale(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(F7,qQ,J),J}getWorldDirection(J){this.updateWorldMatrix(!0,!1);let $=this.matrixWorld.elements;return J.set($[8],$[9],$[10]).normalize()}raycast(){}traverse(J){J(this);let $=this.children;for(let Q=0,Z=$.length;Q<Z;Q++)$[Q].traverse(J)}traverseVisible(J){if(this.visible===!1)return;J(this);let $=this.children;for(let Q=0,Z=$.length;Q<Z;Q++)$[Q].traverseVisible(J)}traverseAncestors(J){let $=this.parent;if($!==null)J($),$.traverseAncestors(J)}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(J){if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||J){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,J=!0}let $=this.children;for(let Q=0,Z=$.length;Q<Z;Q++)$[Q].updateMatrixWorld(J)}updateWorldMatrix(J,$){let Q=this.parent;if(J===!0&&Q!==null)Q.updateWorldMatrix(!0,!1);if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);if($===!0){let Z=this.children;for(let W=0,Y=Z.length;W<Y;W++)Z[W].updateWorldMatrix(!1,!0)}}toJSON(J){let $=J===void 0||typeof J==="string",Q={};if($)J={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},Q.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"};let Z={};if(Z.uuid=this.uuid,Z.type=this.type,this.name!=="")Z.name=this.name;if(this.castShadow===!0)Z.castShadow=!0;if(this.receiveShadow===!0)Z.receiveShadow=!0;if(this.visible===!1)Z.visible=!1;if(this.frustumCulled===!1)Z.frustumCulled=!1;if(this.renderOrder!==0)Z.renderOrder=this.renderOrder;if(Object.keys(this.userData).length>0)Z.userData=this.userData;if(Z.layers=this.layers.mask,Z.matrix=this.matrix.toArray(),Z.up=this.up.toArray(),this.matrixAutoUpdate===!1)Z.matrixAutoUpdate=!1;if(this.isInstancedMesh){if(Z.type="InstancedMesh",Z.count=this.count,Z.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null)Z.instanceColor=this.instanceColor.toJSON()}if(this.isBatchedMesh){if(Z.type="BatchedMesh",Z.perObjectFrustumCulled=this.perObjectFrustumCulled,Z.sortObjects=this.sortObjects,Z.drawRanges=this._drawRanges,Z.reservedRanges=this._reservedRanges,Z.visibility=this._visibility,Z.active=this._active,Z.bounds=this._bounds.map((K)=>({boxInitialized:K.boxInitialized,boxMin:K.box.min.toArray(),boxMax:K.box.max.toArray(),sphereInitialized:K.sphereInitialized,sphereRadius:K.sphere.radius,sphereCenter:K.sphere.center.toArray()})),Z.maxInstanceCount=this._maxInstanceCount,Z.maxVertexCount=this._maxVertexCount,Z.maxIndexCount=this._maxIndexCount,Z.geometryInitialized=this._geometryInitialized,Z.geometryCount=this._geometryCount,Z.matricesTexture=this._matricesTexture.toJSON(J),this._colorsTexture!==null)Z.colorsTexture=this._colorsTexture.toJSON(J);if(this.boundingSphere!==null)Z.boundingSphere={center:Z.boundingSphere.center.toArray(),radius:Z.boundingSphere.radius};if(this.boundingBox!==null)Z.boundingBox={min:Z.boundingBox.min.toArray(),max:Z.boundingBox.max.toArray()}}function W(K,X){if(K[X.uuid]===void 0)K[X.uuid]=X.toJSON(J);return X.uuid}if(this.isScene){if(this.background){if(this.background.isColor)Z.background=this.background.toJSON();else if(this.background.isTexture)Z.background=this.background.toJSON(J).uuid}if(this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0)Z.environment=this.environment.toJSON(J).uuid}else if(this.isMesh||this.isLine||this.isPoints){Z.geometry=W(J.geometries,this.geometry);let K=this.geometry.parameters;if(K!==void 0&&K.shapes!==void 0){let X=K.shapes;if(Array.isArray(X))for(let U=0,H=X.length;U<H;U++){let G=X[U];W(J.shapes,G)}else W(J.shapes,X)}}if(this.isSkinnedMesh){if(Z.bindMode=this.bindMode,Z.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0)W(J.skeletons,this.skeleton),Z.skeleton=this.skeleton.uuid}if(this.material!==void 0)if(Array.isArray(this.material)){let K=[];for(let X=0,U=this.material.length;X<U;X++)K.push(W(J.materials,this.material[X]));Z.material=K}else Z.material=W(J.materials,this.material);if(this.children.length>0){Z.children=[];for(let K=0;K<this.children.length;K++)Z.children.push(this.children[K].toJSON(J).object)}if(this.animations.length>0){Z.animations=[];for(let K=0;K<this.animations.length;K++){let X=this.animations[K];Z.animations.push(W(J.animations,X))}}if($){let K=Y(J.geometries),X=Y(J.materials),U=Y(J.textures),H=Y(J.images),G=Y(J.shapes),V=Y(J.skeletons),q=Y(J.animations),D=Y(J.nodes);if(K.length>0)Q.geometries=K;if(X.length>0)Q.materials=X;if(U.length>0)Q.textures=U;if(H.length>0)Q.images=H;if(G.length>0)Q.shapes=G;if(V.length>0)Q.skeletons=V;if(q.length>0)Q.animations=q;if(D.length>0)Q.nodes=D}return Q.object=Z,Q;function Y(K){let X=[];for(let U in K){let H=K[U];delete H.metadata,X.push(H)}return X}}clone(J){return new this.constructor().copy(this,J)}copy(J,$=!0){if(this.name=J.name,this.up.copy(J.up),this.position.copy(J.position),this.rotation.order=J.rotation.order,this.quaternion.copy(J.quaternion),this.scale.copy(J.scale),this.matrix.copy(J.matrix),this.matrixWorld.copy(J.matrixWorld),this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrixWorldAutoUpdate=J.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=J.matrixWorldNeedsUpdate,this.layers.mask=J.layers.mask,this.visible=J.visible,this.castShadow=J.castShadow,this.receiveShadow=J.receiveShadow,this.frustumCulled=J.frustumCulled,this.renderOrder=J.renderOrder,this.animations=J.animations.slice(),this.userData=JSON.parse(JSON.stringify(J.userData)),$===!0)for(let Q=0;Q<J.children.length;Q++){let Z=J.children[Q];this.add(Z.clone())}return this}}q0.DEFAULT_UP=new A(0,1,0);q0.DEFAULT_MATRIX_AUTO_UPDATE=!0;q0.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var b0=new A,J6=new A,h8=new A,$6=new A,m6=new A,u6=new A,K5=new A,x8=new A,b8=new A,g8=new A,p8=new H0,l8=new H0,m8=new H0;class y0{constructor(J=new A,$=new A,Q=new A){this.a=J,this.b=$,this.c=Q}static getNormal(J,$,Q,Z){Z.subVectors(Q,$),b0.subVectors(J,$),Z.cross(b0);let W=Z.lengthSq();if(W>0)return Z.multiplyScalar(1/Math.sqrt(W));return Z.set(0,0,0)}static getBarycoord(J,$,Q,Z,W){b0.subVectors(Z,$),J6.subVectors(Q,$),h8.subVectors(J,$);let Y=b0.dot(b0),K=b0.dot(J6),X=b0.dot(h8),U=J6.dot(J6),H=J6.dot(h8),G=Y*U-K*K;if(G===0)return W.set(0,0,0),null;let V=1/G,q=(U*X-K*H)*V,D=(Y*H-K*X)*V;return W.set(1-q-D,D,q)}static containsPoint(J,$,Q,Z){if(this.getBarycoord(J,$,Q,Z,$6)===null)return!1;return $6.x>=0&&$6.y>=0&&$6.x+$6.y<=1}static getInterpolation(J,$,Q,Z,W,Y,K,X){if(this.getBarycoord(J,$,Q,Z,$6)===null){if(X.x=0,X.y=0,"z"in X)X.z=0;if("w"in X)X.w=0;return null}return X.setScalar(0),X.addScaledVector(W,$6.x),X.addScaledVector(Y,$6.y),X.addScaledVector(K,$6.z),X}static getInterpolatedAttribute(J,$,Q,Z,W,Y){return p8.setScalar(0),l8.setScalar(0),m8.setScalar(0),p8.fromBufferAttribute(J,$),l8.fromBufferAttribute(J,Q),m8.fromBufferAttribute(J,Z),Y.setScalar(0),Y.addScaledVector(p8,W.x),Y.addScaledVector(l8,W.y),Y.addScaledVector(m8,W.z),Y}static isFrontFacing(J,$,Q,Z){return b0.subVectors(Q,$),J6.subVectors(J,$),b0.cross(J6).dot(Z)<0?!0:!1}set(J,$,Q){return this.a.copy(J),this.b.copy($),this.c.copy(Q),this}setFromPointsAndIndices(J,$,Q,Z){return this.a.copy(J[$]),this.b.copy(J[Q]),this.c.copy(J[Z]),this}setFromAttributeAndIndices(J,$,Q,Z){return this.a.fromBufferAttribute(J,$),this.b.fromBufferAttribute(J,Q),this.c.fromBufferAttribute(J,Z),this}clone(){return new this.constructor().copy(this)}copy(J){return this.a.copy(J.a),this.b.copy(J.b),this.c.copy(J.c),this}getArea(){return b0.subVectors(this.c,this.b),J6.subVectors(this.a,this.b),b0.cross(J6).length()*0.5}getMidpoint(J){return J.addVectors(this.a,this.b).add(this.c).multiplyScalar(0.3333333333333333)}getNormal(J){return y0.getNormal(this.a,this.b,this.c,J)}getPlane(J){return J.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(J,$){return y0.getBarycoord(J,this.a,this.b,this.c,$)}getInterpolation(J,$,Q,Z,W){return y0.getInterpolation(J,this.a,this.b,this.c,$,Q,Z,W)}containsPoint(J){return y0.containsPoint(J,this.a,this.b,this.c)}isFrontFacing(J){return y0.isFrontFacing(this.a,this.b,this.c,J)}intersectsBox(J){return J.intersectsTriangle(this)}closestPointToPoint(J,$){let Q=this.a,Z=this.b,W=this.c,Y,K;m6.subVectors(Z,Q),u6.subVectors(W,Q),x8.subVectors(J,Q);let X=m6.dot(x8),U=u6.dot(x8);if(X<=0&&U<=0)return $.copy(Q);b8.subVectors(J,Z);let H=m6.dot(b8),G=u6.dot(b8);if(H>=0&&G<=H)return $.copy(Z);let V=X*G-H*U;if(V<=0&&X>=0&&H<=0)return Y=X/(X-H),$.copy(Q).addScaledVector(m6,Y);g8.subVectors(J,W);let q=m6.dot(g8),D=u6.dot(g8);if(D>=0&&q<=D)return $.copy(W);let O=q*U-X*D;if(O<=0&&U>=0&&D<=0)return K=U/(U-D),$.copy(Q).addScaledVector(u6,K);let M=H*D-q*G;if(M<=0&&G-H>=0&&q-D>=0)return K5.subVectors(W,Z),K=(G-H)/(G-H+(q-D)),$.copy(Z).addScaledVector(K5,K);let F=1/(M+O+V);return Y=O*F,K=V*F,$.copy(Q).addScaledVector(m6,Y).addScaledVector(u6,K)}equals(J){return J.a.equals(this.a)&&J.b.equals(this.b)&&J.c.equals(this.c)}}var Q$={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},D6={h:0,s:0,l:0},l7={h:0,s:0,l:0};function u8(J,$,Q){if(Q<0)Q+=1;if(Q>1)Q-=1;if(Q<0.16666666666666666)return J+($-J)*6*Q;if(Q<0.5)return $;if(Q<0.6666666666666666)return J+($-J)*6*(0.6666666666666666-Q);return J}class cJ{constructor(J,$,Q){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(J,$,Q)}set(J,$,Q){if($===void 0&&Q===void 0){let Z=J;if(Z&&Z.isColor)this.copy(Z);else if(typeof Z==="number")this.setHex(Z);else if(typeof Z==="string")this.setStyle(Z)}else this.setRGB(J,$,Q);return this}setScalar(J){return this.r=J,this.g=J,this.b=J,this}setHex(J,$="srgb"){return J=Math.floor(J),this.r=(J>>16&255)/255,this.g=(J>>8&255)/255,this.b=(J&255)/255,oJ.toWorkingColorSpace(this,$),this}setRGB(J,$,Q,Z=oJ.workingColorSpace){return this.r=J,this.g=$,this.b=Q,oJ.toWorkingColorSpace(this,Z),this}setHSL(J,$,Q,Z=oJ.workingColorSpace){if(J=e$(J,1),$=B0($,0,1),Q=B0(Q,0,1),$===0)this.r=this.g=this.b=Q;else{let W=Q<=0.5?Q*(1+$):Q+$-Q*$,Y=2*Q-W;this.r=u8(Y,W,J+0.3333333333333333),this.g=u8(Y,W,J),this.b=u8(Y,W,J-0.3333333333333333)}return oJ.toWorkingColorSpace(this,Z),this}setStyle(J,$="srgb"){function Q(W){if(W===void 0)return;if(parseFloat(W)<1)console.warn("THREE.Color: Alpha component of "+J+" will be ignored.")}let Z;if(Z=/^(\w+)\(([^\)]*)\)/.exec(J)){let W,Y=Z[1],K=Z[2];switch(Y){case"rgb":case"rgba":if(W=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(K))return Q(W[4]),this.setRGB(Math.min(255,parseInt(W[1],10))/255,Math.min(255,parseInt(W[2],10))/255,Math.min(255,parseInt(W[3],10))/255,$);if(W=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(K))return Q(W[4]),this.setRGB(Math.min(100,parseInt(W[1],10))/100,Math.min(100,parseInt(W[2],10))/100,Math.min(100,parseInt(W[3],10))/100,$);break;case"hsl":case"hsla":if(W=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(K))return Q(W[4]),this.setHSL(parseFloat(W[1])/360,parseFloat(W[2])/100,parseFloat(W[3])/100,$);break;default:console.warn("THREE.Color: Unknown color model "+J)}}else if(Z=/^\#([A-Fa-f\d]+)$/.exec(J)){let W=Z[1],Y=W.length;if(Y===3)return this.setRGB(parseInt(W.charAt(0),16)/15,parseInt(W.charAt(1),16)/15,parseInt(W.charAt(2),16)/15,$);else if(Y===6)return this.setHex(parseInt(W,16),$);else console.warn("THREE.Color: Invalid hex color "+J)}else if(J&&J.length>0)return this.setColorName(J,$);return this}setColorName(J,$="srgb"){let Q=Q$[J.toLowerCase()];if(Q!==void 0)this.setHex(Q,$);else console.warn("THREE.Color: Unknown color "+J);return this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(J){return this.r=J.r,this.g=J.g,this.b=J.b,this}copySRGBToLinear(J){return this.r=Q6(J.r),this.g=Q6(J.g),this.b=Q6(J.b),this}copyLinearToSRGB(J){return this.r=J7(J.r),this.g=J7(J.g),this.b=J7(J.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(J="srgb"){return oJ.fromWorkingColorSpace(M0.copy(this),J),Math.round(B0(M0.r*255,0,255))*65536+Math.round(B0(M0.g*255,0,255))*256+Math.round(B0(M0.b*255,0,255))}getHexString(J="srgb"){return("000000"+this.getHex(J).toString(16)).slice(-6)}getHSL(J,$=oJ.workingColorSpace){oJ.fromWorkingColorSpace(M0.copy(this),$);let{r:Q,g:Z,b:W}=M0,Y=Math.max(Q,Z,W),K=Math.min(Q,Z,W),X,U,H=(K+Y)/2;if(K===Y)X=0,U=0;else{let G=Y-K;switch(U=H<=0.5?G/(Y+K):G/(2-Y-K),Y){case Q:X=(Z-W)/G+(Z<W?6:0);break;case Z:X=(W-Q)/G+2;break;case W:X=(Q-Z)/G+4;break}X/=6}return J.h=X,J.s=U,J.l=H,J}getRGB(J,$=oJ.workingColorSpace){return oJ.fromWorkingColorSpace(M0.copy(this),$),J.r=M0.r,J.g=M0.g,J.b=M0.b,J}getStyle(J="srgb"){oJ.fromWorkingColorSpace(M0.copy(this),J);let{r:$,g:Q,b:Z}=M0;if(J!=="srgb")return`color(${J} ${$.toFixed(3)} ${Q.toFixed(3)} ${Z.toFixed(3)})`;return`rgb(${Math.round($*255)},${Math.round(Q*255)},${Math.round(Z*255)})`}offsetHSL(J,$,Q){return this.getHSL(D6),this.setHSL(D6.h+J,D6.s+$,D6.l+Q)}add(J){return this.r+=J.r,this.g+=J.g,this.b+=J.b,this}addColors(J,$){return this.r=J.r+$.r,this.g=J.g+$.g,this.b=J.b+$.b,this}addScalar(J){return this.r+=J,this.g+=J,this.b+=J,this}sub(J){return this.r=Math.max(0,this.r-J.r),this.g=Math.max(0,this.g-J.g),this.b=Math.max(0,this.b-J.b),this}multiply(J){return this.r*=J.r,this.g*=J.g,this.b*=J.b,this}multiplyScalar(J){return this.r*=J,this.g*=J,this.b*=J,this}lerp(J,$){return this.r+=(J.r-this.r)*$,this.g+=(J.g-this.g)*$,this.b+=(J.b-this.b)*$,this}lerpColors(J,$,Q){return this.r=J.r+($.r-J.r)*Q,this.g=J.g+($.g-J.g)*Q,this.b=J.b+($.b-J.b)*Q,this}lerpHSL(J,$){this.getHSL(D6),J.getHSL(l7);let Q=A8(D6.h,l7.h,$),Z=A8(D6.s,l7.s,$),W=A8(D6.l,l7.l,$);return this.setHSL(Q,Z,W),this}setFromVector3(J){return this.r=J.x,this.g=J.y,this.b=J.z,this}applyMatrix3(J){let $=this.r,Q=this.g,Z=this.b,W=J.elements;return this.r=W[0]*$+W[3]*Q+W[6]*Z,this.g=W[1]*$+W[4]*Q+W[7]*Z,this.b=W[2]*$+W[5]*Q+W[8]*Z,this}equals(J){return J.r===this.r&&J.g===this.g&&J.b===this.b}fromArray(J,$=0){return this.r=J[$],this.g=J[$+1],this.b=J[$+2],this}toArray(J=[],$=0){return J[$]=this.r,J[$+1]=this.g,J[$+2]=this.b,J}fromBufferAttribute(J,$){return this.r=J.getX($),this.g=J.getY($),this.b=J.getZ($),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}var M0=new cJ;cJ.NAMES=Q$;var EQ=0;class S6 extends T6{static get type(){return"Material"}get type(){return this.constructor.type}set type(J){}constructor(){super();this.isMaterial=!0,Object.defineProperty(this,"id",{value:EQ++}),this.uuid=O6(),this.name="",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new cJ(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(J){if(this._alphaTest>0!==J>0)this.version++;this._alphaTest=J}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(J){if(J===void 0)return;for(let $ in J){let Q=J[$];if(Q===void 0){console.warn(`THREE.Material: parameter '${$}' has value of undefined.`);continue}let Z=this[$];if(Z===void 0){console.warn(`THREE.Material: '${$}' is not a property of THREE.${this.type}.`);continue}if(Z&&Z.isColor)Z.set(Q);else if(Z&&Z.isVector3&&(Q&&Q.isVector3))Z.copy(Q);else this[$]=Q}}toJSON(J){let $=J===void 0||typeof J==="string";if($)J={textures:{},images:{}};let Q={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};if(Q.uuid=this.uuid,Q.type=this.type,this.name!=="")Q.name=this.name;if(this.color&&this.color.isColor)Q.color=this.color.getHex();if(this.roughness!==void 0)Q.roughness=this.roughness;if(this.metalness!==void 0)Q.metalness=this.metalness;if(this.sheen!==void 0)Q.sheen=this.sheen;if(this.sheenColor&&this.sheenColor.isColor)Q.sheenColor=this.sheenColor.getHex();if(this.sheenRoughness!==void 0)Q.sheenRoughness=this.sheenRoughness;if(this.emissive&&this.emissive.isColor)Q.emissive=this.emissive.getHex();if(this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1)Q.emissiveIntensity=this.emissiveIntensity;if(this.specular&&this.specular.isColor)Q.specular=this.specular.getHex();if(this.specularIntensity!==void 0)Q.specularIntensity=this.specularIntensity;if(this.specularColor&&this.specularColor.isColor)Q.specularColor=this.specularColor.getHex();if(this.shininess!==void 0)Q.shininess=this.shininess;if(this.clearcoat!==void 0)Q.clearcoat=this.clearcoat;if(this.clearcoatRoughness!==void 0)Q.clearcoatRoughness=this.clearcoatRoughness;if(this.clearcoatMap&&this.clearcoatMap.isTexture)Q.clearcoatMap=this.clearcoatMap.toJSON(J).uuid;if(this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture)Q.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(J).uuid;if(this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture)Q.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(J).uuid,Q.clearcoatNormalScale=this.clearcoatNormalScale.toArray();if(this.dispersion!==void 0)Q.dispersion=this.dispersion;if(this.iridescence!==void 0)Q.iridescence=this.iridescence;if(this.iridescenceIOR!==void 0)Q.iridescenceIOR=this.iridescenceIOR;if(this.iridescenceThicknessRange!==void 0)Q.iridescenceThicknessRange=this.iridescenceThicknessRange;if(this.iridescenceMap&&this.iridescenceMap.isTexture)Q.iridescenceMap=this.iridescenceMap.toJSON(J).uuid;if(this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture)Q.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(J).uuid;if(this.anisotropy!==void 0)Q.anisotropy=this.anisotropy;if(this.anisotropyRotation!==void 0)Q.anisotropyRotation=this.anisotropyRotation;if(this.anisotropyMap&&this.anisotropyMap.isTexture)Q.anisotropyMap=this.anisotropyMap.toJSON(J).uuid;if(this.map&&this.map.isTexture)Q.map=this.map.toJSON(J).uuid;if(this.matcap&&this.matcap.isTexture)Q.matcap=this.matcap.toJSON(J).uuid;if(this.alphaMap&&this.alphaMap.isTexture)Q.alphaMap=this.alphaMap.toJSON(J).uuid;if(this.lightMap&&this.lightMap.isTexture)Q.lightMap=this.lightMap.toJSON(J).uuid,Q.lightMapIntensity=this.lightMapIntensity;if(this.aoMap&&this.aoMap.isTexture)Q.aoMap=this.aoMap.toJSON(J).uuid,Q.aoMapIntensity=this.aoMapIntensity;if(this.bumpMap&&this.bumpMap.isTexture)Q.bumpMap=this.bumpMap.toJSON(J).uuid,Q.bumpScale=this.bumpScale;if(this.normalMap&&this.normalMap.isTexture)Q.normalMap=this.normalMap.toJSON(J).uuid,Q.normalMapType=this.normalMapType,Q.normalScale=this.normalScale.toArray();if(this.displacementMap&&this.displacementMap.isTexture)Q.displacementMap=this.displacementMap.toJSON(J).uuid,Q.displacementScale=this.displacementScale,Q.displacementBias=this.displacementBias;if(this.roughnessMap&&this.roughnessMap.isTexture)Q.roughnessMap=this.roughnessMap.toJSON(J).uuid;if(this.metalnessMap&&this.metalnessMap.isTexture)Q.metalnessMap=this.metalnessMap.toJSON(J).uuid;if(this.emissiveMap&&this.emissiveMap.isTexture)Q.emissiveMap=this.emissiveMap.toJSON(J).uuid;if(this.specularMap&&this.specularMap.isTexture)Q.specularMap=this.specularMap.toJSON(J).uuid;if(this.specularIntensityMap&&this.specularIntensityMap.isTexture)Q.specularIntensityMap=this.specularIntensityMap.toJSON(J).uuid;if(this.specularColorMap&&this.specularColorMap.isTexture)Q.specularColorMap=this.specularColorMap.toJSON(J).uuid;if(this.envMap&&this.envMap.isTexture){if(Q.envMap=this.envMap.toJSON(J).uuid,this.combine!==void 0)Q.combine=this.combine}if(this.envMapRotation!==void 0)Q.envMapRotation=this.envMapRotation.toArray();if(this.envMapIntensity!==void 0)Q.envMapIntensity=this.envMapIntensity;if(this.reflectivity!==void 0)Q.reflectivity=this.reflectivity;if(this.refractionRatio!==void 0)Q.refractionRatio=this.refractionRatio;if(this.gradientMap&&this.gradientMap.isTexture)Q.gradientMap=this.gradientMap.toJSON(J).uuid;if(this.transmission!==void 0)Q.transmission=this.transmission;if(this.transmissionMap&&this.transmissionMap.isTexture)Q.transmissionMap=this.transmissionMap.toJSON(J).uuid;if(this.thickness!==void 0)Q.thickness=this.thickness;if(this.thicknessMap&&this.thicknessMap.isTexture)Q.thicknessMap=this.thicknessMap.toJSON(J).uuid;if(this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0)Q.attenuationDistance=this.attenuationDistance;if(this.attenuationColor!==void 0)Q.attenuationColor=this.attenuationColor.getHex();if(this.size!==void 0)Q.size=this.size;if(this.shadowSide!==null)Q.shadowSide=this.shadowSide;if(this.sizeAttenuation!==void 0)Q.sizeAttenuation=this.sizeAttenuation;if(this.blending!==1)Q.blending=this.blending;if(this.side!==0)Q.side=this.side;if(this.vertexColors===!0)Q.vertexColors=!0;if(this.opacity<1)Q.opacity=this.opacity;if(this.transparent===!0)Q.transparent=!0;if(this.blendSrc!==204)Q.blendSrc=this.blendSrc;if(this.blendDst!==205)Q.blendDst=this.blendDst;if(this.blendEquation!==100)Q.blendEquation=this.blendEquation;if(this.blendSrcAlpha!==null)Q.blendSrcAlpha=this.blendSrcAlpha;if(this.blendDstAlpha!==null)Q.blendDstAlpha=this.blendDstAlpha;if(this.blendEquationAlpha!==null)Q.blendEquationAlpha=this.blendEquationAlpha;if(this.blendColor&&this.blendColor.isColor)Q.blendColor=this.blendColor.getHex();if(this.blendAlpha!==0)Q.blendAlpha=this.blendAlpha;if(this.depthFunc!==3)Q.depthFunc=this.depthFunc;if(this.depthTest===!1)Q.depthTest=this.depthTest;if(this.depthWrite===!1)Q.depthWrite=this.depthWrite;if(this.colorWrite===!1)Q.colorWrite=this.colorWrite;if(this.stencilWriteMask!==255)Q.stencilWriteMask=this.stencilWriteMask;if(this.stencilFunc!==519)Q.stencilFunc=this.stencilFunc;if(this.stencilRef!==0)Q.stencilRef=this.stencilRef;if(this.stencilFuncMask!==255)Q.stencilFuncMask=this.stencilFuncMask;if(this.stencilFail!==7680)Q.stencilFail=this.stencilFail;if(this.stencilZFail!==7680)Q.stencilZFail=this.stencilZFail;if(this.stencilZPass!==7680)Q.stencilZPass=this.stencilZPass;if(this.stencilWrite===!0)Q.stencilWrite=this.stencilWrite;if(this.rotation!==void 0&&this.rotation!==0)Q.rotation=this.rotation;if(this.polygonOffset===!0)Q.polygonOffset=!0;if(this.polygonOffsetFactor!==0)Q.polygonOffsetFactor=this.polygonOffsetFactor;if(this.polygonOffsetUnits!==0)Q.polygonOffsetUnits=this.polygonOffsetUnits;if(this.linewidth!==void 0&&this.linewidth!==1)Q.linewidth=this.linewidth;if(this.dashSize!==void 0)Q.dashSize=this.dashSize;if(this.gapSize!==void 0)Q.gapSize=this.gapSize;if(this.scale!==void 0)Q.scale=this.scale;if(this.dithering===!0)Q.dithering=!0;if(this.alphaTest>0)Q.alphaTest=this.alphaTest;if(this.alphaHash===!0)Q.alphaHash=!0;if(this.alphaToCoverage===!0)Q.alphaToCoverage=!0;if(this.premultipliedAlpha===!0)Q.premultipliedAlpha=!0;if(this.forceSinglePass===!0)Q.forceSinglePass=!0;if(this.wireframe===!0)Q.wireframe=!0;if(this.wireframeLinewidth>1)Q.wireframeLinewidth=this.wireframeLinewidth;if(this.wireframeLinecap!=="round")Q.wireframeLinecap=this.wireframeLinecap;if(this.wireframeLinejoin!=="round")Q.wireframeLinejoin=this.wireframeLinejoin;if(this.flatShading===!0)Q.flatShading=!0;if(this.visible===!1)Q.visible=!1;if(this.toneMapped===!1)Q.toneMapped=!1;if(this.fog===!1)Q.fog=!1;if(Object.keys(this.userData).length>0)Q.userData=this.userData;function Z(W){let Y=[];for(let K in W){let X=W[K];delete X.metadata,Y.push(X)}return Y}if($){let W=Z(J.textures),Y=Z(J.images);if(W.length>0)Q.textures=W;if(Y.length>0)Q.images=Y}return Q}clone(){return new this.constructor().copy(this)}copy(J){this.name=J.name,this.blending=J.blending,this.side=J.side,this.vertexColors=J.vertexColors,this.opacity=J.opacity,this.transparent=J.transparent,this.blendSrc=J.blendSrc,this.blendDst=J.blendDst,this.blendEquation=J.blendEquation,this.blendSrcAlpha=J.blendSrcAlpha,this.blendDstAlpha=J.blendDstAlpha,this.blendEquationAlpha=J.blendEquationAlpha,this.blendColor.copy(J.blendColor),this.blendAlpha=J.blendAlpha,this.depthFunc=J.depthFunc,this.depthTest=J.depthTest,this.depthWrite=J.depthWrite,this.stencilWriteMask=J.stencilWriteMask,this.stencilFunc=J.stencilFunc,this.stencilRef=J.stencilRef,this.stencilFuncMask=J.stencilFuncMask,this.stencilFail=J.stencilFail,this.stencilZFail=J.stencilZFail,this.stencilZPass=J.stencilZPass,this.stencilWrite=J.stencilWrite;let $=J.clippingPlanes,Q=null;if($!==null){let Z=$.length;Q=Array(Z);for(let W=0;W!==Z;++W)Q[W]=$[W].clone()}return this.clippingPlanes=Q,this.clipIntersection=J.clipIntersection,this.clipShadows=J.clipShadows,this.shadowSide=J.shadowSide,this.colorWrite=J.colorWrite,this.precision=J.precision,this.polygonOffset=J.polygonOffset,this.polygonOffsetFactor=J.polygonOffsetFactor,this.polygonOffsetUnits=J.polygonOffsetUnits,this.dithering=J.dithering,this.alphaTest=J.alphaTest,this.alphaHash=J.alphaHash,this.alphaToCoverage=J.alphaToCoverage,this.premultipliedAlpha=J.premultipliedAlpha,this.forceSinglePass=J.forceSinglePass,this.visible=J.visible,this.toneMapped=J.toneMapped,this.userData=JSON.parse(JSON.stringify(J.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(J){if(J===!0)this.version++}onBuild(){console.warn("Material: onBuild() has been removed.")}}class W6 extends S6{static get type(){return"MeshBasicMaterial"}constructor(J){super();this.isMeshBasicMaterial=!0,this.color=new cJ(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new c0,this.combine=0,this.reflectivity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.fog=J.fog,this}}var G0=new A,m7=new BJ;class k0{constructor(J,$,Q=!1){if(Array.isArray(J))throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=J,this.itemSize=$,this.count=J!==void 0?J.length/$:0,this.normalized=Q,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(J){if(J===!0)this.version++}setUsage(J){return this.usage=J,this}addUpdateRange(J,$){this.updateRanges.push({start:J,count:$})}clearUpdateRanges(){this.updateRanges.length=0}copy(J){return this.name=J.name,this.array=new J.array.constructor(J.array),this.itemSize=J.itemSize,this.count=J.count,this.normalized=J.normalized,this.usage=J.usage,this.gpuType=J.gpuType,this}copyAt(J,$,Q){J*=this.itemSize,Q*=$.itemSize;for(let Z=0,W=this.itemSize;Z<W;Z++)this.array[J+Z]=$.array[Q+Z];return this}copyArray(J){return this.array.set(J),this}applyMatrix3(J){if(this.itemSize===2)for(let $=0,Q=this.count;$<Q;$++)m7.fromBufferAttribute(this,$),m7.applyMatrix3(J),this.setXY($,m7.x,m7.y);else if(this.itemSize===3)for(let $=0,Q=this.count;$<Q;$++)G0.fromBufferAttribute(this,$),G0.applyMatrix3(J),this.setXYZ($,G0.x,G0.y,G0.z);return this}applyMatrix4(J){for(let $=0,Q=this.count;$<Q;$++)G0.fromBufferAttribute(this,$),G0.applyMatrix4(J),this.setXYZ($,G0.x,G0.y,G0.z);return this}applyNormalMatrix(J){for(let $=0,Q=this.count;$<Q;$++)G0.fromBufferAttribute(this,$),G0.applyNormalMatrix(J),this.setXYZ($,G0.x,G0.y,G0.z);return this}transformDirection(J){for(let $=0,Q=this.count;$<Q;$++)G0.fromBufferAttribute(this,$),G0.transformDirection(J),this.setXYZ($,G0.x,G0.y,G0.z);return this}set(J,$=0){return this.array.set(J,$),this}getComponent(J,$){let Q=this.array[J*this.itemSize+$];if(this.normalized)Q=d0(Q,this.array);return Q}setComponent(J,$,Q){if(this.normalized)Q=J0(Q,this.array);return this.array[J*this.itemSize+$]=Q,this}getX(J){let $=this.array[J*this.itemSize];if(this.normalized)$=d0($,this.array);return $}setX(J,$){if(this.normalized)$=J0($,this.array);return this.array[J*this.itemSize]=$,this}getY(J){let $=this.array[J*this.itemSize+1];if(this.normalized)$=d0($,this.array);return $}setY(J,$){if(this.normalized)$=J0($,this.array);return this.array[J*this.itemSize+1]=$,this}getZ(J){let $=this.array[J*this.itemSize+2];if(this.normalized)$=d0($,this.array);return $}setZ(J,$){if(this.normalized)$=J0($,this.array);return this.array[J*this.itemSize+2]=$,this}getW(J){let $=this.array[J*this.itemSize+3];if(this.normalized)$=d0($,this.array);return $}setW(J,$){if(this.normalized)$=J0($,this.array);return this.array[J*this.itemSize+3]=$,this}setXY(J,$,Q){if(J*=this.itemSize,this.normalized)$=J0($,this.array),Q=J0(Q,this.array);return this.array[J+0]=$,this.array[J+1]=Q,this}setXYZ(J,$,Q,Z){if(J*=this.itemSize,this.normalized)$=J0($,this.array),Q=J0(Q,this.array),Z=J0(Z,this.array);return this.array[J+0]=$,this.array[J+1]=Q,this.array[J+2]=Z,this}setXYZW(J,$,Q,Z,W){if(J*=this.itemSize,this.normalized)$=J0($,this.array),Q=J0(Q,this.array),Z=J0(Z,this.array),W=J0(W,this.array);return this.array[J+0]=$,this.array[J+1]=Q,this.array[J+2]=Z,this.array[J+3]=W,this}onUpload(J){return this.onUploadCallback=J,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let J={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};if(this.name!=="")J.name=this.name;if(this.usage!==35044)J.usage=this.usage;return J}}class q9 extends k0{constructor(J,$,Q){super(new Uint16Array(J),$,Q)}}class V9 extends k0{constructor(J,$,Q){super(new Uint32Array(J),$,Q)}}class eJ extends k0{constructor(J,$,Q){super(new Float32Array(J),$,Q)}}var FQ=0,v0=new Q0,d8=new q0,d6=new A,P0=new n0,D7=new n0,F0=new A;class R0 extends T6{constructor(){super();this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:FQ++}),this.uuid=O6(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(J){if(Array.isArray(J))this.index=new((t5(J))?V9:q9)(J,1);else this.index=J;return this}setIndirect(J){return this.indirect=J,this}getIndirect(){return this.indirect}getAttribute(J){return this.attributes[J]}setAttribute(J,$){return this.attributes[J]=$,this}deleteAttribute(J){return delete this.attributes[J],this}hasAttribute(J){return this.attributes[J]!==void 0}addGroup(J,$,Q=0){this.groups.push({start:J,count:$,materialIndex:Q})}clearGroups(){this.groups=[]}setDrawRange(J,$){this.drawRange.start=J,this.drawRange.count=$}applyMatrix4(J){let $=this.attributes.position;if($!==void 0)$.applyMatrix4(J),$.needsUpdate=!0;let Q=this.attributes.normal;if(Q!==void 0){let W=new lJ().getNormalMatrix(J);Q.applyNormalMatrix(W),Q.needsUpdate=!0}let Z=this.attributes.tangent;if(Z!==void 0)Z.transformDirection(J),Z.needsUpdate=!0;if(this.boundingBox!==null)this.computeBoundingBox();if(this.boundingSphere!==null)this.computeBoundingSphere();return this}applyQuaternion(J){return v0.makeRotationFromQuaternion(J),this.applyMatrix4(v0),this}rotateX(J){return v0.makeRotationX(J),this.applyMatrix4(v0),this}rotateY(J){return v0.makeRotationY(J),this.applyMatrix4(v0),this}rotateZ(J){return v0.makeRotationZ(J),this.applyMatrix4(v0),this}translate(J,$,Q){return v0.makeTranslation(J,$,Q),this.applyMatrix4(v0),this}scale(J,$,Q){return v0.makeScale(J,$,Q),this.applyMatrix4(v0),this}lookAt(J){return d8.lookAt(J),d8.updateMatrix(),this.applyMatrix4(d8.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(d6).negate(),this.translate(d6.x,d6.y,d6.z),this}setFromPoints(J){let $=this.getAttribute("position");if($===void 0){let Q=[];for(let Z=0,W=J.length;Z<W;Z++){let Y=J[Z];Q.push(Y.x,Y.y,Y.z||0)}this.setAttribute("position",new eJ(Q,3))}else{for(let Q=0,Z=$.count;Q<Z;Q++){let W=J[Q];$.setXYZ(Q,W.x,W.y,W.z||0)}if(J.length>$.count)console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.");$.needsUpdate=!0}return this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new n0;let J=this.attributes.position,$=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new A(-1/0,-1/0,-1/0),new A(1/0,1/0,1/0));return}if(J!==void 0){if(this.boundingBox.setFromBufferAttribute(J),$)for(let Q=0,Z=$.length;Q<Z;Q++){let W=$[Q];if(P0.setFromBufferAttribute(W),this.morphTargetsRelative)F0.addVectors(this.boundingBox.min,P0.min),this.boundingBox.expandByPoint(F0),F0.addVectors(this.boundingBox.max,P0.max),this.boundingBox.expandByPoint(F0);else this.boundingBox.expandByPoint(P0.min),this.boundingBox.expandByPoint(P0.max)}}else this.boundingBox.makeEmpty();if(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new Q7;let J=this.attributes.position,$=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new A,1/0);return}if(J){let Q=this.boundingSphere.center;if(P0.setFromBufferAttribute(J),$)for(let W=0,Y=$.length;W<Y;W++){let K=$[W];if(D7.setFromBufferAttribute(K),this.morphTargetsRelative)F0.addVectors(P0.min,D7.min),P0.expandByPoint(F0),F0.addVectors(P0.max,D7.max),P0.expandByPoint(F0);else P0.expandByPoint(D7.min),P0.expandByPoint(D7.max)}P0.getCenter(Q);let Z=0;for(let W=0,Y=J.count;W<Y;W++)F0.fromBufferAttribute(J,W),Z=Math.max(Z,Q.distanceToSquared(F0));if($)for(let W=0,Y=$.length;W<Y;W++){let K=$[W],X=this.morphTargetsRelative;for(let U=0,H=K.count;U<H;U++){if(F0.fromBufferAttribute(K,U),X)d6.fromBufferAttribute(J,U),F0.add(d6);Z=Math.max(Z,Q.distanceToSquared(F0))}}if(this.boundingSphere.radius=Math.sqrt(Z),isNaN(this.boundingSphere.radius))console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let J=this.index,$=this.attributes;if(J===null||$.position===void 0||$.normal===void 0||$.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let{position:Q,normal:Z,uv:W}=$;if(this.hasAttribute("tangent")===!1)this.setAttribute("tangent",new k0(new Float32Array(4*Q.count),4));let Y=this.getAttribute("tangent"),K=[],X=[];for(let I=0;I<Q.count;I++)K[I]=new A,X[I]=new A;let U=new A,H=new A,G=new A,V=new BJ,q=new BJ,D=new BJ,O=new A,M=new A;function F(I,x,L){U.fromBufferAttribute(Q,I),H.fromBufferAttribute(Q,x),G.fromBufferAttribute(Q,L),V.fromBufferAttribute(W,I),q.fromBufferAttribute(W,x),D.fromBufferAttribute(W,L),H.sub(U),G.sub(U),q.sub(V),D.sub(V);let _=1/(q.x*D.y-D.x*q.y);if(!isFinite(_))return;O.copy(H).multiplyScalar(D.y).addScaledVector(G,-q.y).multiplyScalar(_),M.copy(G).multiplyScalar(q.x).addScaledVector(H,-D.x).multiplyScalar(_),K[I].add(O),K[x].add(O),K[L].add(O),X[I].add(M),X[x].add(M),X[L].add(M)}let E=this.groups;if(E.length===0)E=[{start:0,count:J.count}];for(let I=0,x=E.length;I<x;++I){let L=E[I],_=L.start,P=L.count;for(let l=_,m=_+P;l<m;l+=3)F(J.getX(l+0),J.getX(l+1),J.getX(l+2))}let z=new A,N=new A,k=new A,f=new A;function w(I){k.fromBufferAttribute(Z,I),f.copy(k);let x=K[I];z.copy(x),z.sub(k.multiplyScalar(k.dot(x))).normalize(),N.crossVectors(f,x);let _=N.dot(X[I])<0?-1:1;Y.setXYZW(I,z.x,z.y,z.z,_)}for(let I=0,x=E.length;I<x;++I){let L=E[I],_=L.start,P=L.count;for(let l=_,m=_+P;l<m;l+=3)w(J.getX(l+0)),w(J.getX(l+1)),w(J.getX(l+2))}}computeVertexNormals(){let J=this.index,$=this.getAttribute("position");if($!==void 0){let Q=this.getAttribute("normal");if(Q===void 0)Q=new k0(new Float32Array($.count*3),3),this.setAttribute("normal",Q);else for(let V=0,q=Q.count;V<q;V++)Q.setXYZ(V,0,0,0);let Z=new A,W=new A,Y=new A,K=new A,X=new A,U=new A,H=new A,G=new A;if(J)for(let V=0,q=J.count;V<q;V+=3){let D=J.getX(V+0),O=J.getX(V+1),M=J.getX(V+2);Z.fromBufferAttribute($,D),W.fromBufferAttribute($,O),Y.fromBufferAttribute($,M),H.subVectors(Y,W),G.subVectors(Z,W),H.cross(G),K.fromBufferAttribute(Q,D),X.fromBufferAttribute(Q,O),U.fromBufferAttribute(Q,M),K.add(H),X.add(H),U.add(H),Q.setXYZ(D,K.x,K.y,K.z),Q.setXYZ(O,X.x,X.y,X.z),Q.setXYZ(M,U.x,U.y,U.z)}else for(let V=0,q=$.count;V<q;V+=3)Z.fromBufferAttribute($,V+0),W.fromBufferAttribute($,V+1),Y.fromBufferAttribute($,V+2),H.subVectors(Y,W),G.subVectors(Z,W),H.cross(G),Q.setXYZ(V+0,H.x,H.y,H.z),Q.setXYZ(V+1,H.x,H.y,H.z),Q.setXYZ(V+2,H.x,H.y,H.z);this.normalizeNormals(),Q.needsUpdate=!0}}normalizeNormals(){let J=this.attributes.normal;for(let $=0,Q=J.count;$<Q;$++)F0.fromBufferAttribute(J,$),F0.normalize(),J.setXYZ($,F0.x,F0.y,F0.z)}toNonIndexed(){function J(K,X){let{array:U,itemSize:H,normalized:G}=K,V=new U.constructor(X.length*H),q=0,D=0;for(let O=0,M=X.length;O<M;O++){if(K.isInterleavedBufferAttribute)q=X[O]*K.data.stride+K.offset;else q=X[O]*H;for(let F=0;F<H;F++)V[D++]=U[q++]}return new k0(V,H,G)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let $=new R0,Q=this.index.array,Z=this.attributes;for(let K in Z){let X=Z[K],U=J(X,Q);$.setAttribute(K,U)}let W=this.morphAttributes;for(let K in W){let X=[],U=W[K];for(let H=0,G=U.length;H<G;H++){let V=U[H],q=J(V,Q);X.push(q)}$.morphAttributes[K]=X}$.morphTargetsRelative=this.morphTargetsRelative;let Y=this.groups;for(let K=0,X=Y.length;K<X;K++){let U=Y[K];$.addGroup(U.start,U.count,U.materialIndex)}return $}toJSON(){let J={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(J.uuid=this.uuid,J.type=this.type,this.name!=="")J.name=this.name;if(Object.keys(this.userData).length>0)J.userData=this.userData;if(this.parameters!==void 0){let X=this.parameters;for(let U in X)if(X[U]!==void 0)J[U]=X[U];return J}J.data={attributes:{}};let $=this.index;if($!==null)J.data.index={type:$.array.constructor.name,array:Array.prototype.slice.call($.array)};let Q=this.attributes;for(let X in Q){let U=Q[X];J.data.attributes[X]=U.toJSON(J.data)}let Z={},W=!1;for(let X in this.morphAttributes){let U=this.morphAttributes[X],H=[];for(let G=0,V=U.length;G<V;G++){let q=U[G];H.push(q.toJSON(J.data))}if(H.length>0)Z[X]=H,W=!0}if(W)J.data.morphAttributes=Z,J.data.morphTargetsRelative=this.morphTargetsRelative;let Y=this.groups;if(Y.length>0)J.data.groups=JSON.parse(JSON.stringify(Y));let K=this.boundingSphere;if(K!==null)J.data.boundingSphere={center:K.center.toArray(),radius:K.radius};return J}clone(){return new this.constructor().copy(this)}copy(J){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let $={};this.name=J.name;let Q=J.index;if(Q!==null)this.setIndex(Q.clone($));let Z=J.attributes;for(let U in Z){let H=Z[U];this.setAttribute(U,H.clone($))}let W=J.morphAttributes;for(let U in W){let H=[],G=W[U];for(let V=0,q=G.length;V<q;V++)H.push(G[V].clone($));this.morphAttributes[U]=H}this.morphTargetsRelative=J.morphTargetsRelative;let Y=J.groups;for(let U=0,H=Y.length;U<H;U++){let G=Y[U];this.addGroup(G.start,G.count,G.materialIndex)}let K=J.boundingBox;if(K!==null)this.boundingBox=K.clone();let X=J.boundingSphere;if(X!==null)this.boundingSphere=X.clone();return this.drawRange.start=J.drawRange.start,this.drawRange.count=J.drawRange.count,this.userData=J.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}var X5=new Q0,_6=new G9,u7=new Q7,U5=new A,d7=new A,c7=new A,n7=new A,c8=new A,s7=new A,H5=new A,o7=new A;class TJ extends q0{constructor(J=new R0,$=new W6){super();this.isMesh=!0,this.type="Mesh",this.geometry=J,this.material=$,this.updateMorphTargets()}copy(J,$){if(super.copy(J,$),J.morphTargetInfluences!==void 0)this.morphTargetInfluences=J.morphTargetInfluences.slice();if(J.morphTargetDictionary!==void 0)this.morphTargetDictionary=Object.assign({},J.morphTargetDictionary);return this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}updateMorphTargets(){let $=this.geometry.morphAttributes,Q=Object.keys($);if(Q.length>0){let Z=$[Q[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let W=0,Y=Z.length;W<Y;W++){let K=Z[W].name||String(W);this.morphTargetInfluences.push(0),this.morphTargetDictionary[K]=W}}}}getVertexPosition(J,$){let Q=this.geometry,Z=Q.attributes.position,W=Q.morphAttributes.position,Y=Q.morphTargetsRelative;$.fromBufferAttribute(Z,J);let K=this.morphTargetInfluences;if(W&&K){s7.set(0,0,0);for(let X=0,U=W.length;X<U;X++){let H=K[X],G=W[X];if(H===0)continue;if(c8.fromBufferAttribute(G,J),Y)s7.addScaledVector(c8,H);else s7.addScaledVector(c8.sub($),H)}$.add(s7)}return $}raycast(J,$){let Q=this.geometry,Z=this.material,W=this.matrixWorld;if(Z===void 0)return;if(Q.boundingSphere===null)Q.computeBoundingSphere();if(u7.copy(Q.boundingSphere),u7.applyMatrix4(W),_6.copy(J.ray).recast(J.near),u7.containsPoint(_6.origin)===!1){if(_6.intersectSphere(u7,U5)===null)return;if(_6.origin.distanceToSquared(U5)>(J.far-J.near)**2)return}if(X5.copy(W).invert(),_6.copy(J.ray).applyMatrix4(X5),Q.boundingBox!==null){if(_6.intersectsBox(Q.boundingBox)===!1)return}this._computeIntersections(J,$,_6)}_computeIntersections(J,$,Q){let Z,W=this.geometry,Y=this.material,K=W.index,X=W.attributes.position,U=W.attributes.uv,H=W.attributes.uv1,G=W.attributes.normal,V=W.groups,q=W.drawRange;if(K!==null)if(Array.isArray(Y))for(let D=0,O=V.length;D<O;D++){let M=V[D],F=Y[M.materialIndex],E=Math.max(M.start,q.start),z=Math.min(K.count,Math.min(M.start+M.count,q.start+q.count));for(let N=E,k=z;N<k;N+=3){let f=K.getX(N),w=K.getX(N+1),I=K.getX(N+2);if(Z=i7(this,F,J,Q,U,H,G,f,w,I),Z)Z.faceIndex=Math.floor(N/3),Z.face.materialIndex=M.materialIndex,$.push(Z)}}else{let D=Math.max(0,q.start),O=Math.min(K.count,q.start+q.count);for(let M=D,F=O;M<F;M+=3){let E=K.getX(M),z=K.getX(M+1),N=K.getX(M+2);if(Z=i7(this,Y,J,Q,U,H,G,E,z,N),Z)Z.faceIndex=Math.floor(M/3),$.push(Z)}}else if(X!==void 0)if(Array.isArray(Y))for(let D=0,O=V.length;D<O;D++){let M=V[D],F=Y[M.materialIndex],E=Math.max(M.start,q.start),z=Math.min(X.count,Math.min(M.start+M.count,q.start+q.count));for(let N=E,k=z;N<k;N+=3){let f=N,w=N+1,I=N+2;if(Z=i7(this,F,J,Q,U,H,G,f,w,I),Z)Z.faceIndex=Math.floor(N/3),Z.face.materialIndex=M.materialIndex,$.push(Z)}}else{let D=Math.max(0,q.start),O=Math.min(X.count,q.start+q.count);for(let M=D,F=O;M<F;M+=3){let E=M,z=M+1,N=M+2;if(Z=i7(this,Y,J,Q,U,H,G,E,z,N),Z)Z.faceIndex=Math.floor(M/3),$.push(Z)}}}}function DQ(J,$,Q,Z,W,Y,K,X){let U;if($.side===1)U=Z.intersectTriangle(K,Y,W,!0,X);else U=Z.intersectTriangle(W,Y,K,$.side===0,X);if(U===null)return null;o7.copy(X),o7.applyMatrix4(J.matrixWorld);let H=Q.ray.origin.distanceTo(o7);if(H<Q.near||H>Q.far)return null;return{distance:H,point:o7.clone(),object:J}}function i7(J,$,Q,Z,W,Y,K,X,U,H){J.getVertexPosition(X,d7),J.getVertexPosition(U,c7),J.getVertexPosition(H,n7);let G=DQ(J,$,Q,Z,d7,c7,n7,H5);if(G){let V=new A;if(y0.getBarycoord(H5,d7,c7,n7,V),W)G.uv=y0.getInterpolatedAttribute(W,X,U,H,V,new BJ);if(Y)G.uv1=y0.getInterpolatedAttribute(Y,X,U,H,V,new BJ);if(K){if(G.normal=y0.getInterpolatedAttribute(K,X,U,H,V,new A),G.normal.dot(Z.direction)>0)G.normal.multiplyScalar(-1)}let q={a:X,b:U,c:H,normal:new A,materialIndex:0};y0.getNormal(d7,c7,n7,q.normal),G.face=q,G.barycoord=V}return G}class w0 extends R0{constructor(J=1,$=1,Q=1,Z=1,W=1,Y=1){super();this.type="BoxGeometry",this.parameters={width:J,height:$,depth:Q,widthSegments:Z,heightSegments:W,depthSegments:Y};let K=this;Z=Math.floor(Z),W=Math.floor(W),Y=Math.floor(Y);let X=[],U=[],H=[],G=[],V=0,q=0;D("z","y","x",-1,-1,Q,$,J,Y,W,0),D("z","y","x",1,-1,Q,$,-J,Y,W,1),D("x","z","y",1,1,J,Q,$,Z,Y,2),D("x","z","y",1,-1,J,Q,-$,Z,Y,3),D("x","y","z",1,-1,J,$,Q,Z,W,4),D("x","y","z",-1,-1,J,$,-Q,Z,W,5),this.setIndex(X),this.setAttribute("position",new eJ(U,3)),this.setAttribute("normal",new eJ(H,3)),this.setAttribute("uv",new eJ(G,2));function D(O,M,F,E,z,N,k,f,w,I,x){let L=N/w,_=k/I,P=N/2,l=k/2,m=f/2,d=w+1,t=I+1,g=0,e=0,u=new A;for(let WJ=0;WJ<t;WJ++){let HJ=WJ*_-l;for(let vJ=0;vJ<d;vJ++){let fJ=vJ*L-P;u[O]=fJ*E,u[M]=HJ*z,u[F]=m,U.push(u.x,u.y,u.z),u[O]=0,u[M]=0,u[F]=f>0?1:-1,H.push(u.x,u.y,u.z),G.push(vJ/w),G.push(1-WJ/I),g+=1}}for(let WJ=0;WJ<I;WJ++)for(let HJ=0;HJ<w;HJ++){let vJ=V+HJ+d*WJ,fJ=V+HJ+d*(WJ+1),o=V+(HJ+1)+d*(WJ+1),JJ=V+(HJ+1)+d*WJ;X.push(vJ,fJ,JJ),X.push(fJ,o,JJ),e+=6}K.addGroup(q,e,x),q+=e,V+=g}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new w0(J.width,J.height,J.depth,J.widthSegments,J.heightSegments,J.depthSegments)}}function $7(J){let $={};for(let Q in J){$[Q]={};for(let Z in J[Q]){let W=J[Q][Z];if(W&&(W.isColor||W.isMatrix3||W.isMatrix4||W.isVector2||W.isVector3||W.isVector4||W.isTexture||W.isQuaternion))if(W.isRenderTargetTexture)console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),$[Q][Z]=null;else $[Q][Z]=W.clone();else if(Array.isArray(W))$[Q][Z]=W.slice();else $[Q][Z]=W}}return $}function C0(J){let $={};for(let Q=0;Q<J.length;Q++){let Z=$7(J[Q]);for(let W in Z)$[W]=Z[W]}return $}function RQ(J){let $=[];for(let Q=0;Q<J.length;Q++)$.push(J[Q].clone());return $}function Z$(J){let $=J.getRenderTarget();if($===null)return J.outputColorSpace;if($.isXRRenderTarget===!0)return $.texture.colorSpace;return oJ.workingColorSpace}var NQ={clone:$7,merge:C0},OQ=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,MQ=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Z6 extends S6{static get type(){return"ShaderMaterial"}constructor(J){super();if(this.isShaderMaterial=!0,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=OQ,this.fragmentShader=MQ,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,J!==void 0)this.setValues(J)}copy(J){return super.copy(J),this.fragmentShader=J.fragmentShader,this.vertexShader=J.vertexShader,this.uniforms=$7(J.uniforms),this.uniformsGroups=RQ(J.uniformsGroups),this.defines=Object.assign({},J.defines),this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.fog=J.fog,this.lights=J.lights,this.clipping=J.clipping,this.extensions=Object.assign({},J.extensions),this.glslVersion=J.glslVersion,this}toJSON(J){let $=super.toJSON(J);$.glslVersion=this.glslVersion,$.uniforms={};for(let Z in this.uniforms){let Y=this.uniforms[Z].value;if(Y&&Y.isTexture)$.uniforms[Z]={type:"t",value:Y.toJSON(J).uuid};else if(Y&&Y.isColor)$.uniforms[Z]={type:"c",value:Y.getHex()};else if(Y&&Y.isVector2)$.uniforms[Z]={type:"v2",value:Y.toArray()};else if(Y&&Y.isVector3)$.uniforms[Z]={type:"v3",value:Y.toArray()};else if(Y&&Y.isVector4)$.uniforms[Z]={type:"v4",value:Y.toArray()};else if(Y&&Y.isMatrix3)$.uniforms[Z]={type:"m3",value:Y.toArray()};else if(Y&&Y.isMatrix4)$.uniforms[Z]={type:"m4",value:Y.toArray()};else $.uniforms[Z]={value:Y}}if(Object.keys(this.defines).length>0)$.defines=this.defines;$.vertexShader=this.vertexShader,$.fragmentShader=this.fragmentShader,$.lights=this.lights,$.clipping=this.clipping;let Q={};for(let Z in this.extensions)if(this.extensions[Z]===!0)Q[Z]=!0;if(Object.keys(Q).length>0)$.extensions=Q;return $}}class E9 extends q0{constructor(){super();this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Q0,this.projectionMatrix=new Q0,this.projectionMatrixInverse=new Q0,this.coordinateSystem=2000}copy(J,$){return super.copy(J,$),this.matrixWorldInverse.copy(J.matrixWorldInverse),this.projectionMatrix.copy(J.projectionMatrix),this.projectionMatrixInverse.copy(J.projectionMatrixInverse),this.coordinateSystem=J.coordinateSystem,this}getWorldDirection(J){return super.getWorldDirection(J).negate()}updateMatrixWorld(J){super.updateMatrixWorld(J),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(J,$){super.updateWorldMatrix(J,$),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}var R6=new A,G5=new BJ,q5=new BJ;class j0 extends E9{constructor(J=50,$=1,Q=0.1,Z=2000){super();this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=J,this.zoom=1,this.near=Q,this.far=Z,this.focus=10,this.aspect=$,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(J,$){return super.copy(J,$),this.fov=J.fov,this.zoom=J.zoom,this.near=J.near,this.far=J.far,this.focus=J.focus,this.aspect=J.aspect,this.view=J.view===null?null:Object.assign({},J.view),this.filmGauge=J.filmGauge,this.filmOffset=J.filmOffset,this}setFocalLength(J){let $=0.5*this.getFilmHeight()/J;this.fov=W9*2*Math.atan($),this.updateProjectionMatrix()}getFocalLength(){let J=Math.tan(k8*0.5*this.fov);return 0.5*this.getFilmHeight()/J}getEffectiveFOV(){return W9*2*Math.atan(Math.tan(k8*0.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(J,$,Q){R6.set(-1,-1,0.5).applyMatrix4(this.projectionMatrixInverse),$.set(R6.x,R6.y).multiplyScalar(-J/R6.z),R6.set(1,1,0.5).applyMatrix4(this.projectionMatrixInverse),Q.set(R6.x,R6.y).multiplyScalar(-J/R6.z)}getViewSize(J,$){return this.getViewBounds(J,G5,q5),$.subVectors(q5,G5)}setViewOffset(J,$,Q,Z,W,Y){if(this.aspect=J/$,this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=$,this.view.offsetX=Q,this.view.offsetY=Z,this.view.width=W,this.view.height=Y,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=this.near,$=J*Math.tan(k8*0.5*this.fov)/this.zoom,Q=2*$,Z=this.aspect*Q,W=-0.5*Z,Y=this.view;if(this.view!==null&&this.view.enabled){let{fullWidth:X,fullHeight:U}=Y;W+=Y.offsetX*Z/X,$-=Y.offsetY*Q/U,Z*=Y.width/X,Q*=Y.height/U}let K=this.filmOffset;if(K!==0)W+=J*K/this.getFilmWidth();this.projectionMatrix.makePerspective(W,W+Z,$,$-Q,J,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let $=super.toJSON(J);if($.object.fov=this.fov,$.object.zoom=this.zoom,$.object.near=this.near,$.object.far=this.far,$.object.focus=this.focus,$.object.aspect=this.aspect,this.view!==null)$.object.view=Object.assign({},this.view);return $.object.filmGauge=this.filmGauge,$.object.filmOffset=this.filmOffset,$}}var c6=-90,n6=1;class W$ extends q0{constructor(J,$,Q){super();this.type="CubeCamera",this.renderTarget=Q,this.coordinateSystem=null,this.activeMipmapLevel=0;let Z=new j0(c6,n6,J,$);Z.layers=this.layers,this.add(Z);let W=new j0(c6,n6,J,$);W.layers=this.layers,this.add(W);let Y=new j0(c6,n6,J,$);Y.layers=this.layers,this.add(Y);let K=new j0(c6,n6,J,$);K.layers=this.layers,this.add(K);let X=new j0(c6,n6,J,$);X.layers=this.layers,this.add(X);let U=new j0(c6,n6,J,$);U.layers=this.layers,this.add(U)}updateCoordinateSystem(){let J=this.coordinateSystem,$=this.children.concat(),[Q,Z,W,Y,K,X]=$;for(let U of $)this.remove(U);if(J===2000)Q.up.set(0,1,0),Q.lookAt(1,0,0),Z.up.set(0,1,0),Z.lookAt(-1,0,0),W.up.set(0,0,-1),W.lookAt(0,1,0),Y.up.set(0,0,1),Y.lookAt(0,-1,0),K.up.set(0,1,0),K.lookAt(0,0,1),X.up.set(0,1,0),X.lookAt(0,0,-1);else if(J===2001)Q.up.set(0,-1,0),Q.lookAt(-1,0,0),Z.up.set(0,-1,0),Z.lookAt(1,0,0),W.up.set(0,0,1),W.lookAt(0,1,0),Y.up.set(0,0,-1),Y.lookAt(0,-1,0),K.up.set(0,-1,0),K.lookAt(0,0,1),X.up.set(0,-1,0),X.lookAt(0,0,-1);else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+J);for(let U of $)this.add(U),U.updateMatrixWorld()}update(J,$){if(this.parent===null)this.updateMatrixWorld();let{renderTarget:Q,activeMipmapLevel:Z}=this;if(this.coordinateSystem!==J.coordinateSystem)this.coordinateSystem=J.coordinateSystem,this.updateCoordinateSystem();let[W,Y,K,X,U,H]=this.children,G=J.getRenderTarget(),V=J.getActiveCubeFace(),q=J.getActiveMipmapLevel(),D=J.xr.enabled;J.xr.enabled=!1;let O=Q.texture.generateMipmaps;Q.texture.generateMipmaps=!1,J.setRenderTarget(Q,0,Z),J.render($,W),J.setRenderTarget(Q,1,Z),J.render($,Y),J.setRenderTarget(Q,2,Z),J.render($,K),J.setRenderTarget(Q,3,Z),J.render($,X),J.setRenderTarget(Q,4,Z),J.render($,U),Q.texture.generateMipmaps=O,J.setRenderTarget(Q,5,Z),J.render($,H),J.setRenderTarget(G,V,q),J.xr.enabled=D,Q.texture.needsPMREMUpdate=!0}}class F9 extends L0{constructor(J,$,Q,Z,W,Y,K,X,U,H){J=J!==void 0?J:[],$=$!==void 0?$:301;super(J,$,Q,Z,W,Y,K,X,U,H);this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(J){this.image=J}}class Y$ extends M6{constructor(J=1,$={}){super(J,J,$);this.isWebGLCubeRenderTarget=!0;let Q={width:J,height:J,depth:1},Z=[Q,Q,Q,Q,Q,Q];this.texture=new F9(Z,$.mapping,$.wrapS,$.wrapT,$.magFilter,$.minFilter,$.format,$.type,$.anisotropy,$.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=$.generateMipmaps!==void 0?$.generateMipmaps:!1,this.texture.minFilter=$.minFilter!==void 0?$.minFilter:1006}fromEquirectangularTexture(J,$){this.texture.type=$.type,this.texture.colorSpace=$.colorSpace,this.texture.generateMipmaps=$.generateMipmaps,this.texture.minFilter=$.minFilter,this.texture.magFilter=$.magFilter;let Q={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},Z=new w0(5,5,5),W=new Z6({name:"CubemapFromEquirect",uniforms:$7(Q.uniforms),vertexShader:Q.vertexShader,fragmentShader:Q.fragmentShader,side:1,blending:0});W.uniforms.tEquirect.value=$;let Y=new TJ(Z,W),K=$.minFilter;if($.minFilter===1008)$.minFilter=1006;return new W$(1,10,this).update(J,Y),$.minFilter=K,Y.geometry.dispose(),Y.material.dispose(),this}clear(J,$,Q,Z){let W=J.getRenderTarget();for(let Y=0;Y<6;Y++)J.setRenderTarget(this,Y),J.clear($,Q,Z);J.setRenderTarget(W)}}var n8=new A,BQ=new A,LQ=new lJ;class N6{constructor(J=new A(1,0,0),$=0){this.isPlane=!0,this.normal=J,this.constant=$}set(J,$){return this.normal.copy(J),this.constant=$,this}setComponents(J,$,Q,Z){return this.normal.set(J,$,Q),this.constant=Z,this}setFromNormalAndCoplanarPoint(J,$){return this.normal.copy(J),this.constant=-$.dot(this.normal),this}setFromCoplanarPoints(J,$,Q){let Z=n8.subVectors(Q,$).cross(BQ.subVectors(J,$)).normalize();return this.setFromNormalAndCoplanarPoint(Z,J),this}copy(J){return this.normal.copy(J.normal),this.constant=J.constant,this}normalize(){let J=1/this.normal.length();return this.normal.multiplyScalar(J),this.constant*=J,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(J){return this.normal.dot(J)+this.constant}distanceToSphere(J){return this.distanceToPoint(J.center)-J.radius}projectPoint(J,$){return $.copy(J).addScaledVector(this.normal,-this.distanceToPoint(J))}intersectLine(J,$){let Q=J.delta(n8),Z=this.normal.dot(Q);if(Z===0){if(this.distanceToPoint(J.start)===0)return $.copy(J.start);return null}let W=-(J.start.dot(this.normal)+this.constant)/Z;if(W<0||W>1)return null;return $.copy(J.start).addScaledVector(Q,W)}intersectsLine(J){let $=this.distanceToPoint(J.start),Q=this.distanceToPoint(J.end);return $<0&&Q>0||Q<0&&$>0}intersectsBox(J){return J.intersectsPlane(this)}intersectsSphere(J){return J.intersectsPlane(this)}coplanarPoint(J){return J.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(J,$){let Q=$||LQ.getNormalMatrix(J),Z=this.coplanarPoint(n8).applyMatrix4(J),W=this.normal.applyMatrix3(Q).normalize();return this.constant=-Z.dot(W),this}translate(J){return this.constant-=J.dot(this.normal),this}equals(J){return J.normal.equals(this.normal)&&J.constant===this.constant}clone(){return new this.constructor().copy(this)}}var C6=new Q7,a7=new A;class q8{constructor(J=new N6,$=new N6,Q=new N6,Z=new N6,W=new N6,Y=new N6){this.planes=[J,$,Q,Z,W,Y]}set(J,$,Q,Z,W,Y){let K=this.planes;return K[0].copy(J),K[1].copy($),K[2].copy(Q),K[3].copy(Z),K[4].copy(W),K[5].copy(Y),this}copy(J){let $=this.planes;for(let Q=0;Q<6;Q++)$[Q].copy(J.planes[Q]);return this}setFromProjectionMatrix(J,$=2000){let Q=this.planes,Z=J.elements,W=Z[0],Y=Z[1],K=Z[2],X=Z[3],U=Z[4],H=Z[5],G=Z[6],V=Z[7],q=Z[8],D=Z[9],O=Z[10],M=Z[11],F=Z[12],E=Z[13],z=Z[14],N=Z[15];if(Q[0].setComponents(X-W,V-U,M-q,N-F).normalize(),Q[1].setComponents(X+W,V+U,M+q,N+F).normalize(),Q[2].setComponents(X+Y,V+H,M+D,N+E).normalize(),Q[3].setComponents(X-Y,V-H,M-D,N-E).normalize(),Q[4].setComponents(X-K,V-G,M-O,N-z).normalize(),$===2000)Q[5].setComponents(X+K,V+G,M+O,N+z).normalize();else if($===2001)Q[5].setComponents(K,G,O,z).normalize();else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+$);return this}intersectsObject(J){if(J.boundingSphere!==void 0){if(J.boundingSphere===null)J.computeBoundingSphere();C6.copy(J.boundingSphere).applyMatrix4(J.matrixWorld)}else{let $=J.geometry;if($.boundingSphere===null)$.computeBoundingSphere();C6.copy($.boundingSphere).applyMatrix4(J.matrixWorld)}return this.intersectsSphere(C6)}intersectsSprite(J){return C6.center.set(0,0,0),C6.radius=0.7071067811865476,C6.applyMatrix4(J.matrixWorld),this.intersectsSphere(C6)}intersectsSphere(J){let $=this.planes,Q=J.center,Z=-J.radius;for(let W=0;W<6;W++)if($[W].distanceToPoint(Q)<Z)return!1;return!0}intersectsBox(J){let $=this.planes;for(let Q=0;Q<6;Q++){let Z=$[Q];if(a7.x=Z.normal.x>0?J.max.x:J.min.x,a7.y=Z.normal.y>0?J.max.y:J.min.y,a7.z=Z.normal.z>0?J.max.z:J.min.z,Z.distanceToPoint(a7)<0)return!1}return!0}containsPoint(J){let $=this.planes;for(let Q=0;Q<6;Q++)if($[Q].distanceToPoint(J)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function K$(){let J=null,$=!1,Q=null,Z=null;function W(Y,K){Q(Y,K),Z=J.requestAnimationFrame(W)}return{start:function(){if($===!0)return;if(Q===null)return;Z=J.requestAnimationFrame(W),$=!0},stop:function(){J.cancelAnimationFrame(Z),$=!1},setAnimationLoop:function(Y){Q=Y},setContext:function(Y){J=Y}}}function zQ(J){let $=new WeakMap;function Q(X,U){let{array:H,usage:G}=X,V=H.byteLength,q=J.createBuffer();J.bindBuffer(U,q),J.bufferData(U,H,G),X.onUploadCallback();let D;if(H instanceof Float32Array)D=J.FLOAT;else if(H instanceof Uint16Array)if(X.isFloat16BufferAttribute)D=J.HALF_FLOAT;else D=J.UNSIGNED_SHORT;else if(H instanceof Int16Array)D=J.SHORT;else if(H instanceof Uint32Array)D=J.UNSIGNED_INT;else if(H instanceof Int32Array)D=J.INT;else if(H instanceof Int8Array)D=J.BYTE;else if(H instanceof Uint8Array)D=J.UNSIGNED_BYTE;else if(H instanceof Uint8ClampedArray)D=J.UNSIGNED_BYTE;else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: "+H);return{buffer:q,type:D,bytesPerElement:H.BYTES_PER_ELEMENT,version:X.version,size:V}}function Z(X,U,H){let{array:G,updateRanges:V}=U;if(J.bindBuffer(H,X),V.length===0)J.bufferSubData(H,0,G);else{V.sort((D,O)=>D.start-O.start);let q=0;for(let D=1;D<V.length;D++){let O=V[q],M=V[D];if(M.start<=O.start+O.count+1)O.count=Math.max(O.count,M.start+M.count-O.start);else++q,V[q]=M}V.length=q+1;for(let D=0,O=V.length;D<O;D++){let M=V[D];J.bufferSubData(H,M.start*G.BYTES_PER_ELEMENT,G,M.start,M.count)}U.clearUpdateRanges()}U.onUploadCallback()}function W(X){if(X.isInterleavedBufferAttribute)X=X.data;return $.get(X)}function Y(X){if(X.isInterleavedBufferAttribute)X=X.data;let U=$.get(X);if(U)J.deleteBuffer(U.buffer),$.delete(X)}function K(X,U){if(X.isInterleavedBufferAttribute)X=X.data;if(X.isGLBufferAttribute){let G=$.get(X);if(!G||G.version<X.version)$.set(X,{buffer:X.buffer,type:X.type,bytesPerElement:X.elementSize,version:X.version});return}let H=$.get(X);if(H===void 0)$.set(X,Q(X,U));else if(H.version<X.version){if(H.size!==X.array.byteLength)throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");Z(H.buffer,X,U),H.version=X.version}}return{get:W,remove:Y,update:K}}class Y6 extends R0{constructor(J=1,$=1,Q=1,Z=1){super();this.type="PlaneGeometry",this.parameters={width:J,height:$,widthSegments:Q,heightSegments:Z};let W=J/2,Y=$/2,K=Math.floor(Q),X=Math.floor(Z),U=K+1,H=X+1,G=J/K,V=$/X,q=[],D=[],O=[],M=[];for(let F=0;F<H;F++){let E=F*V-Y;for(let z=0;z<U;z++){let N=z*G-W;D.push(N,-E,0),O.push(0,0,1),M.push(z/K),M.push(1-F/X)}}for(let F=0;F<X;F++)for(let E=0;E<K;E++){let z=E+U*F,N=E+U*(F+1),k=E+1+U*(F+1),f=E+1+U*F;q.push(z,N,f),q.push(N,k,f)}this.setIndex(q),this.setAttribute("position",new eJ(D,3)),this.setAttribute("normal",new eJ(O,3)),this.setAttribute("uv",new eJ(M,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new Y6(J.width,J.height,J.widthSegments,J.heightSegments)}}var _Q=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,CQ=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,kQ=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,AQ=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,wQ=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,IQ=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,TQ=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,PQ=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,SQ=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,vQ=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,jQ=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,yQ=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,fQ=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,hQ=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,xQ=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,bQ=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,gQ=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,pQ=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,lQ=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,mQ=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,uQ=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,dQ=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,cQ=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,nQ=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,sQ=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,oQ=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,iQ=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,aQ=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,rQ=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,tQ=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,eQ="gl_FragColor = linearToOutputTexel( gl_FragColor );",JZ=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,$Z=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,QZ=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,ZZ=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,WZ=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,YZ=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,KZ=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,XZ=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,UZ=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,HZ=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,GZ=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,qZ=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,VZ=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,EZ=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,FZ=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,DZ=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,RZ=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,NZ=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,OZ=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,MZ=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,BZ=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,LZ=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,zZ=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,_Z=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,CZ=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,kZ=`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,AZ=`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,wZ=`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,IZ=`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,TZ=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,PZ=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,SZ=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,vZ=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,jZ=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,yZ=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,fZ=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,hZ=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,xZ=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,bZ=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,gZ=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,pZ=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,lZ=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,mZ=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,uZ=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,dZ=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,cZ=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,nZ=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,sZ=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,oZ=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iZ=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,aZ=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,rZ=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,tZ=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,eZ=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,JW=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,$W=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,QW=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,ZW=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,WW=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,YW=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,KW=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,XW=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,UW=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,HW=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,GW=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,qW=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,VW=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,EW=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,FW=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,DW=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,RW=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,NW=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
		
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
		
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		
		#else
		
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,OW=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,MW=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,BW=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,LW=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,zW=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,_W=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,CW=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,kW=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,AW=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,wW=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,IW=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,TW=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,PW=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,SW=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,vW=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,jW=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,yW=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,fW=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,hW=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,xW=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bW=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,gW=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,pW=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,lW=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,mW=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,uW=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,dW=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,cW=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,nW=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,sW=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,oW=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,iW=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,aW=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,rW=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,tW=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,eW=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,JY=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,$Y=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,uJ={alphahash_fragment:_Q,alphahash_pars_fragment:CQ,alphamap_fragment:kQ,alphamap_pars_fragment:AQ,alphatest_fragment:wQ,alphatest_pars_fragment:IQ,aomap_fragment:TQ,aomap_pars_fragment:PQ,batching_pars_vertex:SQ,batching_vertex:vQ,begin_vertex:jQ,beginnormal_vertex:yQ,bsdfs:fQ,iridescence_fragment:hQ,bumpmap_pars_fragment:xQ,clipping_planes_fragment:bQ,clipping_planes_pars_fragment:gQ,clipping_planes_pars_vertex:pQ,clipping_planes_vertex:lQ,color_fragment:mQ,color_pars_fragment:uQ,color_pars_vertex:dQ,color_vertex:cQ,common:nQ,cube_uv_reflection_fragment:sQ,defaultnormal_vertex:oQ,displacementmap_pars_vertex:iQ,displacementmap_vertex:aQ,emissivemap_fragment:rQ,emissivemap_pars_fragment:tQ,colorspace_fragment:eQ,colorspace_pars_fragment:JZ,envmap_fragment:$Z,envmap_common_pars_fragment:QZ,envmap_pars_fragment:ZZ,envmap_pars_vertex:WZ,envmap_physical_pars_fragment:DZ,envmap_vertex:YZ,fog_vertex:KZ,fog_pars_vertex:XZ,fog_fragment:UZ,fog_pars_fragment:HZ,gradientmap_pars_fragment:GZ,lightmap_pars_fragment:qZ,lights_lambert_fragment:VZ,lights_lambert_pars_fragment:EZ,lights_pars_begin:FZ,lights_toon_fragment:RZ,lights_toon_pars_fragment:NZ,lights_phong_fragment:OZ,lights_phong_pars_fragment:MZ,lights_physical_fragment:BZ,lights_physical_pars_fragment:LZ,lights_fragment_begin:zZ,lights_fragment_maps:_Z,lights_fragment_end:CZ,logdepthbuf_fragment:kZ,logdepthbuf_pars_fragment:AZ,logdepthbuf_pars_vertex:wZ,logdepthbuf_vertex:IZ,map_fragment:TZ,map_pars_fragment:PZ,map_particle_fragment:SZ,map_particle_pars_fragment:vZ,metalnessmap_fragment:jZ,metalnessmap_pars_fragment:yZ,morphinstance_vertex:fZ,morphcolor_vertex:hZ,morphnormal_vertex:xZ,morphtarget_pars_vertex:bZ,morphtarget_vertex:gZ,normal_fragment_begin:pZ,normal_fragment_maps:lZ,normal_pars_fragment:mZ,normal_pars_vertex:uZ,normal_vertex:dZ,normalmap_pars_fragment:cZ,clearcoat_normal_fragment_begin:nZ,clearcoat_normal_fragment_maps:sZ,clearcoat_pars_fragment:oZ,iridescence_pars_fragment:iZ,opaque_fragment:aZ,packing:rZ,premultiplied_alpha_fragment:tZ,project_vertex:eZ,dithering_fragment:JW,dithering_pars_fragment:$W,roughnessmap_fragment:QW,roughnessmap_pars_fragment:ZW,shadowmap_pars_fragment:WW,shadowmap_pars_vertex:YW,shadowmap_vertex:KW,shadowmask_pars_fragment:XW,skinbase_vertex:UW,skinning_pars_vertex:HW,skinning_vertex:GW,skinnormal_vertex:qW,specularmap_fragment:VW,specularmap_pars_fragment:EW,tonemapping_fragment:FW,tonemapping_pars_fragment:DW,transmission_fragment:RW,transmission_pars_fragment:NW,uv_pars_fragment:OW,uv_pars_vertex:MW,uv_vertex:BW,worldpos_vertex:LW,background_vert:zW,background_frag:_W,backgroundCube_vert:CW,backgroundCube_frag:kW,cube_vert:AW,cube_frag:wW,depth_vert:IW,depth_frag:TW,distanceRGBA_vert:PW,distanceRGBA_frag:SW,equirect_vert:vW,equirect_frag:jW,linedashed_vert:yW,linedashed_frag:fW,meshbasic_vert:hW,meshbasic_frag:xW,meshlambert_vert:bW,meshlambert_frag:gW,meshmatcap_vert:pW,meshmatcap_frag:lW,meshnormal_vert:mW,meshnormal_frag:uW,meshphong_vert:dW,meshphong_frag:cW,meshphysical_vert:nW,meshphysical_frag:sW,meshtoon_vert:oW,meshtoon_frag:iW,points_vert:aW,points_frag:rW,shadow_vert:tW,shadow_frag:eW,sprite_vert:JY,sprite_frag:$Y},XJ={common:{diffuse:{value:new cJ(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new lJ},alphaMap:{value:null},alphaMapTransform:{value:new lJ},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new lJ}},envmap:{envMap:{value:null},envMapRotation:{value:new lJ},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:0.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new lJ}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new lJ}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new lJ},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new lJ},normalScale:{value:new BJ(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new lJ},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new lJ}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new lJ}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new lJ}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:0.00025},fogNear:{value:1},fogFar:{value:2000},fogColor:{value:new cJ(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new cJ(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new lJ},alphaTest:{value:0},uvTransform:{value:new lJ}},sprite:{diffuse:{value:new cJ(16777215)},opacity:{value:1},center:{value:new BJ(0.5,0.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new lJ},alphaMap:{value:null},alphaMapTransform:{value:new lJ},alphaTest:{value:0}}},u0={basic:{uniforms:C0([XJ.common,XJ.specularmap,XJ.envmap,XJ.aomap,XJ.lightmap,XJ.fog]),vertexShader:uJ.meshbasic_vert,fragmentShader:uJ.meshbasic_frag},lambert:{uniforms:C0([XJ.common,XJ.specularmap,XJ.envmap,XJ.aomap,XJ.lightmap,XJ.emissivemap,XJ.bumpmap,XJ.normalmap,XJ.displacementmap,XJ.fog,XJ.lights,{emissive:{value:new cJ(0)}}]),vertexShader:uJ.meshlambert_vert,fragmentShader:uJ.meshlambert_frag},phong:{uniforms:C0([XJ.common,XJ.specularmap,XJ.envmap,XJ.aomap,XJ.lightmap,XJ.emissivemap,XJ.bumpmap,XJ.normalmap,XJ.displacementmap,XJ.fog,XJ.lights,{emissive:{value:new cJ(0)},specular:{value:new cJ(1118481)},shininess:{value:30}}]),vertexShader:uJ.meshphong_vert,fragmentShader:uJ.meshphong_frag},standard:{uniforms:C0([XJ.common,XJ.envmap,XJ.aomap,XJ.lightmap,XJ.emissivemap,XJ.bumpmap,XJ.normalmap,XJ.displacementmap,XJ.roughnessmap,XJ.metalnessmap,XJ.fog,XJ.lights,{emissive:{value:new cJ(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:uJ.meshphysical_vert,fragmentShader:uJ.meshphysical_frag},toon:{uniforms:C0([XJ.common,XJ.aomap,XJ.lightmap,XJ.emissivemap,XJ.bumpmap,XJ.normalmap,XJ.displacementmap,XJ.gradientmap,XJ.fog,XJ.lights,{emissive:{value:new cJ(0)}}]),vertexShader:uJ.meshtoon_vert,fragmentShader:uJ.meshtoon_frag},matcap:{uniforms:C0([XJ.common,XJ.bumpmap,XJ.normalmap,XJ.displacementmap,XJ.fog,{matcap:{value:null}}]),vertexShader:uJ.meshmatcap_vert,fragmentShader:uJ.meshmatcap_frag},points:{uniforms:C0([XJ.points,XJ.fog]),vertexShader:uJ.points_vert,fragmentShader:uJ.points_frag},dashed:{uniforms:C0([XJ.common,XJ.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:uJ.linedashed_vert,fragmentShader:uJ.linedashed_frag},depth:{uniforms:C0([XJ.common,XJ.displacementmap]),vertexShader:uJ.depth_vert,fragmentShader:uJ.depth_frag},normal:{uniforms:C0([XJ.common,XJ.bumpmap,XJ.normalmap,XJ.displacementmap,{opacity:{value:1}}]),vertexShader:uJ.meshnormal_vert,fragmentShader:uJ.meshnormal_frag},sprite:{uniforms:C0([XJ.sprite,XJ.fog]),vertexShader:uJ.sprite_vert,fragmentShader:uJ.sprite_frag},background:{uniforms:{uvTransform:{value:new lJ},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:uJ.background_vert,fragmentShader:uJ.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new lJ}},vertexShader:uJ.backgroundCube_vert,fragmentShader:uJ.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:uJ.cube_vert,fragmentShader:uJ.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:uJ.equirect_vert,fragmentShader:uJ.equirect_frag},distanceRGBA:{uniforms:C0([XJ.common,XJ.displacementmap,{referencePosition:{value:new A},nearDistance:{value:1},farDistance:{value:1000}}]),vertexShader:uJ.distanceRGBA_vert,fragmentShader:uJ.distanceRGBA_frag},shadow:{uniforms:C0([XJ.lights,XJ.fog,{color:{value:new cJ(0)},opacity:{value:1}}]),vertexShader:uJ.shadow_vert,fragmentShader:uJ.shadow_frag}};u0.physical={uniforms:C0([u0.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new lJ},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new lJ},clearcoatNormalScale:{value:new BJ(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new lJ},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new lJ},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new lJ},sheen:{value:0},sheenColor:{value:new cJ(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new lJ},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new lJ},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new lJ},transmissionSamplerSize:{value:new BJ},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new lJ},attenuationDistance:{value:0},attenuationColor:{value:new cJ(0)},specularColor:{value:new cJ(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new lJ},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new lJ},anisotropyVector:{value:new BJ},anisotropyMap:{value:null},anisotropyMapTransform:{value:new lJ}}]),vertexShader:uJ.meshphysical_vert,fragmentShader:uJ.meshphysical_frag};var r7={r:0,b:0,g:0},k6=new c0,QY=new Q0;function ZY(J,$,Q,Z,W,Y,K){let X=new cJ(0),U=Y===!0?0:1,H,G,V=null,q=0,D=null;function O(z){let N=z.isScene===!0?z.background:null;if(N&&N.isTexture)N=(z.backgroundBlurriness>0?Q:$).get(N);return N}function M(z){let N=!1,k=O(z);if(k===null)E(X,U);else if(k&&k.isColor)E(k,1),N=!0;let f=J.xr.getEnvironmentBlendMode();if(f==="additive")Z.buffers.color.setClear(0,0,0,1,K);else if(f==="alpha-blend")Z.buffers.color.setClear(0,0,0,0,K);if(J.autoClear||N)Z.buffers.depth.setTest(!0),Z.buffers.depth.setMask(!0),Z.buffers.color.setMask(!0),J.clear(J.autoClearColor,J.autoClearDepth,J.autoClearStencil)}function F(z,N){let k=O(N);if(k&&(k.isCubeTexture||k.mapping===306)){if(G===void 0)G=new TJ(new w0(1,1,1),new Z6({name:"BackgroundCubeMaterial",uniforms:$7(u0.backgroundCube.uniforms),vertexShader:u0.backgroundCube.vertexShader,fragmentShader:u0.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1})),G.geometry.deleteAttribute("normal"),G.geometry.deleteAttribute("uv"),G.onBeforeRender=function(f,w,I){this.matrixWorld.copyPosition(I.matrixWorld)},Object.defineProperty(G.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),W.update(G);if(k6.copy(N.backgroundRotation),k6.x*=-1,k6.y*=-1,k6.z*=-1,k.isCubeTexture&&k.isRenderTargetTexture===!1)k6.y*=-1,k6.z*=-1;if(G.material.uniforms.envMap.value=k,G.material.uniforms.flipEnvMap.value=k.isCubeTexture&&k.isRenderTargetTexture===!1?-1:1,G.material.uniforms.backgroundBlurriness.value=N.backgroundBlurriness,G.material.uniforms.backgroundIntensity.value=N.backgroundIntensity,G.material.uniforms.backgroundRotation.value.setFromMatrix4(QY.makeRotationFromEuler(k6)),G.material.toneMapped=oJ.getTransfer(k.colorSpace)!=="srgb",V!==k||q!==k.version||D!==J.toneMapping)G.material.needsUpdate=!0,V=k,q=k.version,D=J.toneMapping;G.layers.enableAll(),z.unshift(G,G.geometry,G.material,0,0,null)}else if(k&&k.isTexture){if(H===void 0)H=new TJ(new Y6(2,2),new Z6({name:"BackgroundMaterial",uniforms:$7(u0.background.uniforms),vertexShader:u0.background.vertexShader,fragmentShader:u0.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1})),H.geometry.deleteAttribute("normal"),Object.defineProperty(H.material,"map",{get:function(){return this.uniforms.t2D.value}}),W.update(H);if(H.material.uniforms.t2D.value=k,H.material.uniforms.backgroundIntensity.value=N.backgroundIntensity,H.material.toneMapped=oJ.getTransfer(k.colorSpace)!=="srgb",k.matrixAutoUpdate===!0)k.updateMatrix();if(H.material.uniforms.uvTransform.value.copy(k.matrix),V!==k||q!==k.version||D!==J.toneMapping)H.material.needsUpdate=!0,V=k,q=k.version,D=J.toneMapping;H.layers.enableAll(),z.unshift(H,H.geometry,H.material,0,0,null)}}function E(z,N){z.getRGB(r7,Z$(J)),Z.buffers.color.setClear(r7.r,r7.g,r7.b,N,K)}return{getClearColor:function(){return X},setClearColor:function(z,N=1){X.set(z),U=N,E(X,U)},getClearAlpha:function(){return U},setClearAlpha:function(z){U=z,E(X,U)},render:M,addToRenderList:F}}function WY(J,$){let Q=J.getParameter(J.MAX_VERTEX_ATTRIBS),Z={},W=q(null),Y=W,K=!1;function X(_,P,l,m,d){let t=!1,g=V(m,l,P);if(Y!==g)Y=g,H(Y.object);if(t=D(_,m,l,d),t)O(_,m,l,d);if(d!==null)$.update(d,J.ELEMENT_ARRAY_BUFFER);if(t||K){if(K=!1,k(_,P,l,m),d!==null)J.bindBuffer(J.ELEMENT_ARRAY_BUFFER,$.get(d).buffer)}}function U(){return J.createVertexArray()}function H(_){return J.bindVertexArray(_)}function G(_){return J.deleteVertexArray(_)}function V(_,P,l){let m=l.wireframe===!0,d=Z[_.id];if(d===void 0)d={},Z[_.id]=d;let t=d[P.id];if(t===void 0)t={},d[P.id]=t;let g=t[m];if(g===void 0)g=q(U()),t[m]=g;return g}function q(_){let P=[],l=[],m=[];for(let d=0;d<Q;d++)P[d]=0,l[d]=0,m[d]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:P,enabledAttributes:l,attributeDivisors:m,object:_,attributes:{},index:null}}function D(_,P,l,m){let d=Y.attributes,t=P.attributes,g=0,e=l.getAttributes();for(let u in e)if(e[u].location>=0){let HJ=d[u],vJ=t[u];if(vJ===void 0){if(u==="instanceMatrix"&&_.instanceMatrix)vJ=_.instanceMatrix;if(u==="instanceColor"&&_.instanceColor)vJ=_.instanceColor}if(HJ===void 0)return!0;if(HJ.attribute!==vJ)return!0;if(vJ&&HJ.data!==vJ.data)return!0;g++}if(Y.attributesNum!==g)return!0;if(Y.index!==m)return!0;return!1}function O(_,P,l,m){let d={},t=P.attributes,g=0,e=l.getAttributes();for(let u in e)if(e[u].location>=0){let HJ=t[u];if(HJ===void 0){if(u==="instanceMatrix"&&_.instanceMatrix)HJ=_.instanceMatrix;if(u==="instanceColor"&&_.instanceColor)HJ=_.instanceColor}let vJ={};if(vJ.attribute=HJ,HJ&&HJ.data)vJ.data=HJ.data;d[u]=vJ,g++}Y.attributes=d,Y.attributesNum=g,Y.index=m}function M(){let _=Y.newAttributes;for(let P=0,l=_.length;P<l;P++)_[P]=0}function F(_){E(_,0)}function E(_,P){let{newAttributes:l,enabledAttributes:m,attributeDivisors:d}=Y;if(l[_]=1,m[_]===0)J.enableVertexAttribArray(_),m[_]=1;if(d[_]!==P)J.vertexAttribDivisor(_,P),d[_]=P}function z(){let{newAttributes:_,enabledAttributes:P}=Y;for(let l=0,m=P.length;l<m;l++)if(P[l]!==_[l])J.disableVertexAttribArray(l),P[l]=0}function N(_,P,l,m,d,t,g){if(g===!0)J.vertexAttribIPointer(_,P,l,d,t);else J.vertexAttribPointer(_,P,l,m,d,t)}function k(_,P,l,m){M();let d=m.attributes,t=l.getAttributes(),g=P.defaultAttributeValues;for(let e in t){let u=t[e];if(u.location>=0){let WJ=d[e];if(WJ===void 0){if(e==="instanceMatrix"&&_.instanceMatrix)WJ=_.instanceMatrix;if(e==="instanceColor"&&_.instanceColor)WJ=_.instanceColor}if(WJ!==void 0){let{normalized:HJ,itemSize:vJ}=WJ,fJ=$.get(WJ);if(fJ===void 0)continue;let{buffer:o,type:JJ,bytesPerElement:PJ}=fJ,SJ=JJ===J.INT||JJ===J.UNSIGNED_INT||WJ.gpuType===1013;if(WJ.isInterleavedBufferAttribute){let UJ=WJ.data,T=UJ.stride,jJ=WJ.offset;if(UJ.isInstancedInterleavedBuffer){for(let OJ=0;OJ<u.locationSize;OJ++)E(u.location+OJ,UJ.meshPerAttribute);if(_.isInstancedMesh!==!0&&m._maxInstanceCount===void 0)m._maxInstanceCount=UJ.meshPerAttribute*UJ.count}else for(let OJ=0;OJ<u.locationSize;OJ++)F(u.location+OJ);J.bindBuffer(J.ARRAY_BUFFER,o);for(let OJ=0;OJ<u.locationSize;OJ++)N(u.location+OJ,vJ/u.locationSize,JJ,HJ,T*PJ,(jJ+vJ/u.locationSize*OJ)*PJ,SJ)}else{if(WJ.isInstancedBufferAttribute){for(let UJ=0;UJ<u.locationSize;UJ++)E(u.location+UJ,WJ.meshPerAttribute);if(_.isInstancedMesh!==!0&&m._maxInstanceCount===void 0)m._maxInstanceCount=WJ.meshPerAttribute*WJ.count}else for(let UJ=0;UJ<u.locationSize;UJ++)F(u.location+UJ);J.bindBuffer(J.ARRAY_BUFFER,o);for(let UJ=0;UJ<u.locationSize;UJ++)N(u.location+UJ,vJ/u.locationSize,JJ,HJ,vJ*PJ,vJ/u.locationSize*UJ*PJ,SJ)}}else if(g!==void 0){let HJ=g[e];if(HJ!==void 0)switch(HJ.length){case 2:J.vertexAttrib2fv(u.location,HJ);break;case 3:J.vertexAttrib3fv(u.location,HJ);break;case 4:J.vertexAttrib4fv(u.location,HJ);break;default:J.vertexAttrib1fv(u.location,HJ)}}}}z()}function f(){x();for(let _ in Z){let P=Z[_];for(let l in P){let m=P[l];for(let d in m)G(m[d].object),delete m[d];delete P[l]}delete Z[_]}}function w(_){if(Z[_.id]===void 0)return;let P=Z[_.id];for(let l in P){let m=P[l];for(let d in m)G(m[d].object),delete m[d];delete P[l]}delete Z[_.id]}function I(_){for(let P in Z){let l=Z[P];if(l[_.id]===void 0)continue;let m=l[_.id];for(let d in m)G(m[d].object),delete m[d];delete l[_.id]}}function x(){if(L(),K=!0,Y===W)return;Y=W,H(Y.object)}function L(){W.geometry=null,W.program=null,W.wireframe=!1}return{setup:X,reset:x,resetDefaultState:L,dispose:f,releaseStatesOfGeometry:w,releaseStatesOfProgram:I,initAttributes:M,enableAttribute:F,disableUnusedAttributes:z}}function YY(J,$,Q){let Z;function W(H){Z=H}function Y(H,G){J.drawArrays(Z,H,G),Q.update(G,Z,1)}function K(H,G,V){if(V===0)return;J.drawArraysInstanced(Z,H,G,V),Q.update(G,Z,V)}function X(H,G,V){if(V===0)return;$.get("WEBGL_multi_draw").multiDrawArraysWEBGL(Z,H,0,G,0,V);let D=0;for(let O=0;O<V;O++)D+=G[O];Q.update(D,Z,1)}function U(H,G,V,q){if(V===0)return;let D=$.get("WEBGL_multi_draw");if(D===null)for(let O=0;O<H.length;O++)K(H[O],G[O],q[O]);else{D.multiDrawArraysInstancedWEBGL(Z,H,0,G,0,q,0,V);let O=0;for(let M=0;M<V;M++)O+=G[M]*q[M];Q.update(O,Z,1)}}this.setMode=W,this.render=Y,this.renderInstances=K,this.renderMultiDraw=X,this.renderMultiDrawInstances=U}function KY(J,$,Q,Z){let W;function Y(){if(W!==void 0)return W;if($.has("EXT_texture_filter_anisotropic")===!0){let I=$.get("EXT_texture_filter_anisotropic");W=J.getParameter(I.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else W=0;return W}function K(I){if(I!==1023&&Z.convert(I)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_FORMAT))return!1;return!0}function X(I){let x=I===1016&&($.has("EXT_color_buffer_half_float")||$.has("EXT_color_buffer_float"));if(I!==1009&&Z.convert(I)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_TYPE)&&I!==1015&&!x)return!1;return!0}function U(I){if(I==="highp"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.HIGH_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.HIGH_FLOAT).precision>0)return"highp";I="mediump"}if(I==="mediump"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.MEDIUM_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.MEDIUM_FLOAT).precision>0)return"mediump"}return"lowp"}let H=Q.precision!==void 0?Q.precision:"highp",G=U(H);if(G!==H)console.warn("THREE.WebGLRenderer:",H,"not supported, using",G,"instead."),H=G;let V=Q.logarithmicDepthBuffer===!0,q=Q.reverseDepthBuffer===!0&&$.has("EXT_clip_control"),D=J.getParameter(J.MAX_TEXTURE_IMAGE_UNITS),O=J.getParameter(J.MAX_VERTEX_TEXTURE_IMAGE_UNITS),M=J.getParameter(J.MAX_TEXTURE_SIZE),F=J.getParameter(J.MAX_CUBE_MAP_TEXTURE_SIZE),E=J.getParameter(J.MAX_VERTEX_ATTRIBS),z=J.getParameter(J.MAX_VERTEX_UNIFORM_VECTORS),N=J.getParameter(J.MAX_VARYING_VECTORS),k=J.getParameter(J.MAX_FRAGMENT_UNIFORM_VECTORS),f=O>0,w=J.getParameter(J.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:Y,getMaxPrecision:U,textureFormatReadable:K,textureTypeReadable:X,precision:H,logarithmicDepthBuffer:V,reverseDepthBuffer:q,maxTextures:D,maxVertexTextures:O,maxTextureSize:M,maxCubemapSize:F,maxAttributes:E,maxVertexUniforms:z,maxVaryings:N,maxFragmentUniforms:k,vertexTextures:f,maxSamples:w}}function XY(J){let $=this,Q=null,Z=0,W=!1,Y=!1,K=new N6,X=new lJ,U={value:null,needsUpdate:!1};this.uniform=U,this.numPlanes=0,this.numIntersection=0,this.init=function(V,q){let D=V.length!==0||q||Z!==0||W;return W=q,Z=V.length,D},this.beginShadows=function(){Y=!0,G(null)},this.endShadows=function(){Y=!1},this.setGlobalState=function(V,q){Q=G(V,q,0)},this.setState=function(V,q,D){let{clippingPlanes:O,clipIntersection:M,clipShadows:F}=V,E=J.get(V);if(!W||O===null||O.length===0||Y&&!F)if(Y)G(null);else H();else{let z=Y?0:Z,N=z*4,k=E.clippingState||null;U.value=k,k=G(O,q,N,D);for(let f=0;f!==N;++f)k[f]=Q[f];E.clippingState=k,this.numIntersection=M?this.numPlanes:0,this.numPlanes+=z}};function H(){if(U.value!==Q)U.value=Q,U.needsUpdate=Z>0;$.numPlanes=Z,$.numIntersection=0}function G(V,q,D,O){let M=V!==null?V.length:0,F=null;if(M!==0){if(F=U.value,O!==!0||F===null){let E=D+M*4,z=q.matrixWorldInverse;if(X.getNormalMatrix(z),F===null||F.length<E)F=new Float32Array(E);for(let N=0,k=D;N!==M;++N,k+=4)K.copy(V[N]).applyMatrix4(z,X),K.normal.toArray(F,k),F[k+3]=K.constant}U.value=F,U.needsUpdate=!0}return $.numPlanes=M,$.numIntersection=0,F}}function UY(J){let $=new WeakMap;function Q(K,X){if(X===303)K.mapping=301;else if(X===304)K.mapping=302;return K}function Z(K){if(K&&K.isTexture){let X=K.mapping;if(X===303||X===304)if($.has(K)){let U=$.get(K).texture;return Q(U,K.mapping)}else{let U=K.image;if(U&&U.height>0){let H=new Y$(U.height);return H.fromEquirectangularTexture(J,K),$.set(K,H),K.addEventListener("dispose",W),Q(H.texture,K.mapping)}else return null}}return K}function W(K){let X=K.target;X.removeEventListener("dispose",W);let U=$.get(X);if(U!==void 0)$.delete(X),U.dispose()}function Y(){$=new WeakMap}return{get:Z,dispose:Y}}class w7 extends E9{constructor(J=-1,$=1,Q=1,Z=-1,W=0.1,Y=2000){super();this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=J,this.right=$,this.top=Q,this.bottom=Z,this.near=W,this.far=Y,this.updateProjectionMatrix()}copy(J,$){return super.copy(J,$),this.left=J.left,this.right=J.right,this.top=J.top,this.bottom=J.bottom,this.near=J.near,this.far=J.far,this.zoom=J.zoom,this.view=J.view===null?null:Object.assign({},J.view),this}setViewOffset(J,$,Q,Z,W,Y){if(this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=$,this.view.offsetX=Q,this.view.offsetY=Z,this.view.width=W,this.view.height=Y,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=(this.right-this.left)/(2*this.zoom),$=(this.top-this.bottom)/(2*this.zoom),Q=(this.right+this.left)/2,Z=(this.top+this.bottom)/2,W=Q-J,Y=Q+J,K=Z+$,X=Z-$;if(this.view!==null&&this.view.enabled){let U=(this.right-this.left)/this.view.fullWidth/this.zoom,H=(this.top-this.bottom)/this.view.fullHeight/this.zoom;W+=U*this.view.offsetX,Y=W+U*this.view.width,K-=H*this.view.offsetY,X=K-H*this.view.height}this.projectionMatrix.makeOrthographic(W,Y,K,X,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let $=super.toJSON(J);if($.object.zoom=this.zoom,$.object.left=this.left,$.object.right=this.right,$.object.top=this.top,$.object.bottom=this.bottom,$.object.near=this.near,$.object.far=this.far,this.view!==null)$.object.view=Object.assign({},this.view);return $}}var e6=4,V5=[0.125,0.215,0.35,0.446,0.526,0.582],I6=20,s8=new w7,E5=new cJ,o8=null,i8=0,a8=0,r8=!1,w6=(1+Math.sqrt(5))/2,s6=1/w6,F5=[new A(-w6,s6,0),new A(w6,s6,0),new A(-s6,0,w6),new A(s6,0,w6),new A(0,w6,-s6),new A(0,w6,s6),new A(-1,1,-1),new A(1,1,-1),new A(-1,1,1),new A(1,1,1)];class Y9{constructor(J){this._renderer=J,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(J,$=0,Q=0.1,Z=100){o8=this._renderer.getRenderTarget(),i8=this._renderer.getActiveCubeFace(),a8=this._renderer.getActiveMipmapLevel(),r8=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);let W=this._allocateTargets();if(W.depthBuffer=!0,this._sceneToCubeUV(J,Q,Z,W),$>0)this._blur(W,0,0,$);return this._applyPMREM(W),this._cleanup(W),W}fromEquirectangular(J,$=null){return this._fromTexture(J,$)}fromCubemap(J,$=null){return this._fromTexture(J,$)}compileCubemapShader(){if(this._cubemapMaterial===null)this._cubemapMaterial=N5(),this._compileMaterial(this._cubemapMaterial)}compileEquirectangularShader(){if(this._equirectMaterial===null)this._equirectMaterial=R5(),this._compileMaterial(this._equirectMaterial)}dispose(){if(this._dispose(),this._cubemapMaterial!==null)this._cubemapMaterial.dispose();if(this._equirectMaterial!==null)this._equirectMaterial.dispose()}_setSize(J){this._lodMax=Math.floor(Math.log2(J)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){if(this._blurMaterial!==null)this._blurMaterial.dispose();if(this._pingPongRenderTarget!==null)this._pingPongRenderTarget.dispose();for(let J=0;J<this._lodPlanes.length;J++)this._lodPlanes[J].dispose()}_cleanup(J){this._renderer.setRenderTarget(o8,i8,a8),this._renderer.xr.enabled=r8,J.scissorTest=!1,t7(J,0,0,J.width,J.height)}_fromTexture(J,$){if(J.mapping===301||J.mapping===302)this._setSize(J.image.length===0?16:J.image[0].width||J.image[0].image.width);else this._setSize(J.image.width/4);o8=this._renderer.getRenderTarget(),i8=this._renderer.getActiveCubeFace(),a8=this._renderer.getActiveMipmapLevel(),r8=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let Q=$||this._allocateTargets();return this._textureToCubeUV(J,Q),this._applyPMREM(Q),this._cleanup(Q),Q}_allocateTargets(){let J=3*Math.max(this._cubeSize,112),$=4*this._cubeSize,Q={magFilter:1006,minFilter:1006,generateMipmaps:!1,type:1016,format:1023,colorSpace:"srgb-linear",depthBuffer:!1},Z=D5(J,$,Q);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==J||this._pingPongRenderTarget.height!==$){if(this._pingPongRenderTarget!==null)this._dispose();this._pingPongRenderTarget=D5(J,$,Q);let{_lodMax:W}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=HY(W)),this._blurMaterial=GY(W,J,$)}return Z}_compileMaterial(J){let $=new TJ(this._lodPlanes[0],J);this._renderer.compile($,s8)}_sceneToCubeUV(J,$,Q,Z){let K=new j0(90,1,$,Q),X=[1,-1,1,1,1,1],U=[1,1,1,-1,-1,-1],H=this._renderer,G=H.autoClear,V=H.toneMapping;H.getClearColor(E5),H.toneMapping=0,H.autoClear=!1;let q=new W6({name:"PMREM.Background",side:1,depthWrite:!1,depthTest:!1}),D=new TJ(new w0,q),O=!1,M=J.background;if(M){if(M.isColor)q.color.copy(M),J.background=null,O=!0}else q.color.copy(E5),O=!0;for(let F=0;F<6;F++){let E=F%3;if(E===0)K.up.set(0,X[F],0),K.lookAt(U[F],0,0);else if(E===1)K.up.set(0,0,X[F]),K.lookAt(0,U[F],0);else K.up.set(0,X[F],0),K.lookAt(0,0,U[F]);let z=this._cubeSize;if(t7(Z,E*z,F>2?z:0,z,z),H.setRenderTarget(Z),O)H.render(D,K);H.render(J,K)}D.geometry.dispose(),D.material.dispose(),H.toneMapping=V,H.autoClear=G,J.background=M}_textureToCubeUV(J,$){let Q=this._renderer,Z=J.mapping===301||J.mapping===302;if(Z){if(this._cubemapMaterial===null)this._cubemapMaterial=N5();this._cubemapMaterial.uniforms.flipEnvMap.value=J.isRenderTargetTexture===!1?-1:1}else if(this._equirectMaterial===null)this._equirectMaterial=R5();let W=Z?this._cubemapMaterial:this._equirectMaterial,Y=new TJ(this._lodPlanes[0],W),K=W.uniforms;K.envMap.value=J;let X=this._cubeSize;t7($,0,0,3*X,2*X),Q.setRenderTarget($),Q.render(Y,s8)}_applyPMREM(J){let $=this._renderer,Q=$.autoClear;$.autoClear=!1;let Z=this._lodPlanes.length;for(let W=1;W<Z;W++){let Y=Math.sqrt(this._sigmas[W]*this._sigmas[W]-this._sigmas[W-1]*this._sigmas[W-1]),K=F5[(Z-W-1)%F5.length];this._blur(J,W-1,W,Y,K)}$.autoClear=Q}_blur(J,$,Q,Z,W){let Y=this._pingPongRenderTarget;this._halfBlur(J,Y,$,Q,Z,"latitudinal",W),this._halfBlur(Y,J,Q,Q,Z,"longitudinal",W)}_halfBlur(J,$,Q,Z,W,Y,K){let X=this._renderer,U=this._blurMaterial;if(Y!=="latitudinal"&&Y!=="longitudinal")console.error("blur direction must be either latitudinal or longitudinal!");let H=3,G=new TJ(this._lodPlanes[Z],U),V=U.uniforms,q=this._sizeLods[Q]-1,D=isFinite(W)?Math.PI/(2*q):2*Math.PI/(2*I6-1),O=W/D,M=isFinite(W)?1+Math.floor(H*O):I6;if(M>I6)console.warn(`sigmaRadians, ${W}, is too large and will clip, as it requested ${M} samples when the maximum is set to ${I6}`);let F=[],E=0;for(let w=0;w<I6;++w){let I=w/O,x=Math.exp(-I*I/2);if(F.push(x),w===0)E+=x;else if(w<M)E+=2*x}for(let w=0;w<F.length;w++)F[w]=F[w]/E;if(V.envMap.value=J.texture,V.samples.value=M,V.weights.value=F,V.latitudinal.value=Y==="latitudinal",K)V.poleAxis.value=K;let{_lodMax:z}=this;V.dTheta.value=D,V.mipInt.value=z-Q;let N=this._sizeLods[Z],k=3*N*(Z>z-e6?Z-z+e6:0),f=4*(this._cubeSize-N);t7($,k,f,3*N,2*N),X.setRenderTarget($),X.render(G,s8)}}function HY(J){let $=[],Q=[],Z=[],W=J,Y=J-e6+1+V5.length;for(let K=0;K<Y;K++){let X=Math.pow(2,W);Q.push(X);let U=1/X;if(K>J-e6)U=V5[K-J+e6-1];else if(K===0)U=0;Z.push(U);let H=1/(X-2),G=-H,V=1+H,q=[G,G,V,G,V,V,G,G,V,V,G,V],D=6,O=6,M=3,F=2,E=1,z=new Float32Array(M*O*D),N=new Float32Array(F*O*D),k=new Float32Array(E*O*D);for(let w=0;w<D;w++){let I=w%3*2/3-1,x=w>2?0:-1,L=[I,x,0,I+0.6666666666666666,x,0,I+0.6666666666666666,x+1,0,I,x,0,I+0.6666666666666666,x+1,0,I,x+1,0];z.set(L,M*O*w),N.set(q,F*O*w);let _=[w,w,w,w,w,w];k.set(_,E*O*w)}let f=new R0;if(f.setAttribute("position",new k0(z,M)),f.setAttribute("uv",new k0(N,F)),f.setAttribute("faceIndex",new k0(k,E)),$.push(f),W>e6)W--}return{lodPlanes:$,sizeLods:Q,sigmas:Z}}function D5(J,$,Q){let Z=new M6(J,$,Q);return Z.texture.mapping=306,Z.texture.name="PMREM.cubeUv",Z.scissorTest=!0,Z}function t7(J,$,Q,Z,W){J.viewport.set($,Q,Z,W),J.scissor.set($,Q,Z,W)}function GY(J,$,Q){let Z=new Float32Array(I6),W=new A(0,1,0);return new Z6({name:"SphericalGaussianBlur",defines:{n:I6,CUBEUV_TEXEL_WIDTH:1/$,CUBEUV_TEXEL_HEIGHT:1/Q,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:Z},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:W}},vertexShader:D9(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function R5(){return new Z6({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:D9(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function N5(){return new Z6({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:D9(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function D9(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function qY(J){let $=new WeakMap,Q=null;function Z(X){if(X&&X.isTexture){let U=X.mapping,H=U===303||U===304,G=U===301||U===302;if(H||G){let V=$.get(X),q=V!==void 0?V.texture.pmremVersion:0;if(X.isRenderTargetTexture&&X.pmremVersion!==q){if(Q===null)Q=new Y9(J);return V=H?Q.fromEquirectangular(X,V):Q.fromCubemap(X,V),V.texture.pmremVersion=X.pmremVersion,$.set(X,V),V.texture}else if(V!==void 0)return V.texture;else{let D=X.image;if(H&&D&&D.height>0||G&&D&&W(D)){if(Q===null)Q=new Y9(J);return V=H?Q.fromEquirectangular(X):Q.fromCubemap(X),V.texture.pmremVersion=X.pmremVersion,$.set(X,V),X.addEventListener("dispose",Y),V.texture}else return null}}}return X}function W(X){let U=0,H=6;for(let G=0;G<H;G++)if(X[G]!==void 0)U++;return U===H}function Y(X){let U=X.target;U.removeEventListener("dispose",Y);let H=$.get(U);if(H!==void 0)$.delete(U),H.dispose()}function K(){if($=new WeakMap,Q!==null)Q.dispose(),Q=null}return{get:Z,dispose:K}}function VY(J){let $={};function Q(Z){if($[Z]!==void 0)return $[Z];let W;switch(Z){case"WEBGL_depth_texture":W=J.getExtension("WEBGL_depth_texture")||J.getExtension("MOZ_WEBGL_depth_texture")||J.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":W=J.getExtension("EXT_texture_filter_anisotropic")||J.getExtension("MOZ_EXT_texture_filter_anisotropic")||J.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":W=J.getExtension("WEBGL_compressed_texture_s3tc")||J.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||J.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":W=J.getExtension("WEBGL_compressed_texture_pvrtc")||J.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:W=J.getExtension(Z)}return $[Z]=W,W}return{has:function(Z){return Q(Z)!==null},init:function(){Q("EXT_color_buffer_float"),Q("WEBGL_clip_cull_distance"),Q("OES_texture_float_linear"),Q("EXT_color_buffer_half_float"),Q("WEBGL_multisampled_render_to_texture"),Q("WEBGL_render_shared_exponent")},get:function(Z){let W=Q(Z);if(W===null)L7("THREE.WebGLRenderer: "+Z+" extension not supported.");return W}}}function EY(J,$,Q,Z){let W={},Y=new WeakMap;function K(V){let q=V.target;if(q.index!==null)$.remove(q.index);for(let O in q.attributes)$.remove(q.attributes[O]);for(let O in q.morphAttributes){let M=q.morphAttributes[O];for(let F=0,E=M.length;F<E;F++)$.remove(M[F])}q.removeEventListener("dispose",K),delete W[q.id];let D=Y.get(q);if(D)$.remove(D),Y.delete(q);if(Z.releaseStatesOfGeometry(q),q.isInstancedBufferGeometry===!0)delete q._maxInstanceCount;Q.memory.geometries--}function X(V,q){if(W[q.id]===!0)return q;return q.addEventListener("dispose",K),W[q.id]=!0,Q.memory.geometries++,q}function U(V){let q=V.attributes;for(let O in q)$.update(q[O],J.ARRAY_BUFFER);let D=V.morphAttributes;for(let O in D){let M=D[O];for(let F=0,E=M.length;F<E;F++)$.update(M[F],J.ARRAY_BUFFER)}}function H(V){let q=[],D=V.index,O=V.attributes.position,M=0;if(D!==null){let z=D.array;M=D.version;for(let N=0,k=z.length;N<k;N+=3){let f=z[N+0],w=z[N+1],I=z[N+2];q.push(f,w,w,I,I,f)}}else if(O!==void 0){let z=O.array;M=O.version;for(let N=0,k=z.length/3-1;N<k;N+=3){let f=N+0,w=N+1,I=N+2;q.push(f,w,w,I,I,f)}}else return;let F=new((t5(q))?V9:q9)(q,1);F.version=M;let E=Y.get(V);if(E)$.remove(E);Y.set(V,F)}function G(V){let q=Y.get(V);if(q){let D=V.index;if(D!==null){if(q.version<D.version)H(V)}}else H(V);return Y.get(V)}return{get:X,update:U,getWireframeAttribute:G}}function FY(J,$,Q){let Z;function W(q){Z=q}let Y,K;function X(q){Y=q.type,K=q.bytesPerElement}function U(q,D){J.drawElements(Z,D,Y,q*K),Q.update(D,Z,1)}function H(q,D,O){if(O===0)return;J.drawElementsInstanced(Z,D,Y,q*K,O),Q.update(D,Z,O)}function G(q,D,O){if(O===0)return;$.get("WEBGL_multi_draw").multiDrawElementsWEBGL(Z,D,0,Y,q,0,O);let F=0;for(let E=0;E<O;E++)F+=D[E];Q.update(F,Z,1)}function V(q,D,O,M){if(O===0)return;let F=$.get("WEBGL_multi_draw");if(F===null)for(let E=0;E<q.length;E++)H(q[E]/K,D[E],M[E]);else{F.multiDrawElementsInstancedWEBGL(Z,D,0,Y,q,0,M,0,O);let E=0;for(let z=0;z<O;z++)E+=D[z]*M[z];Q.update(E,Z,1)}}this.setMode=W,this.setIndex=X,this.render=U,this.renderInstances=H,this.renderMultiDraw=G,this.renderMultiDrawInstances=V}function DY(J){let $={geometries:0,textures:0},Q={frame:0,calls:0,triangles:0,points:0,lines:0};function Z(Y,K,X){switch(Q.calls++,K){case J.TRIANGLES:Q.triangles+=X*(Y/3);break;case J.LINES:Q.lines+=X*(Y/2);break;case J.LINE_STRIP:Q.lines+=X*(Y-1);break;case J.LINE_LOOP:Q.lines+=X*Y;break;case J.POINTS:Q.points+=X*Y;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",K);break}}function W(){Q.calls=0,Q.triangles=0,Q.points=0,Q.lines=0}return{memory:$,render:Q,programs:null,autoReset:!0,reset:W,update:Z}}function RY(J,$,Q){let Z=new WeakMap,W=new H0;function Y(K,X,U){let H=K.morphTargetInfluences,G=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,V=G!==void 0?G.length:0,q=Z.get(X);if(q===void 0||q.count!==V){let L=function(){I.dispose(),Z.delete(X),X.removeEventListener("dispose",L)};if(q!==void 0)q.texture.dispose();let D=X.morphAttributes.position!==void 0,O=X.morphAttributes.normal!==void 0,M=X.morphAttributes.color!==void 0,F=X.morphAttributes.position||[],E=X.morphAttributes.normal||[],z=X.morphAttributes.color||[],N=0;if(D===!0)N=1;if(O===!0)N=2;if(M===!0)N=3;let k=X.attributes.position.count*N,f=1;if(k>$.maxTextureSize)f=Math.ceil(k/$.maxTextureSize),k=$.maxTextureSize;let w=new Float32Array(k*f*4*V),I=new H9(w,k,f,V);I.type=1015,I.needsUpdate=!0;let x=N*4;for(let _=0;_<V;_++){let P=F[_],l=E[_],m=z[_],d=k*f*4*_;for(let t=0;t<P.count;t++){let g=t*x;if(D===!0)W.fromBufferAttribute(P,t),w[d+g+0]=W.x,w[d+g+1]=W.y,w[d+g+2]=W.z,w[d+g+3]=0;if(O===!0)W.fromBufferAttribute(l,t),w[d+g+4]=W.x,w[d+g+5]=W.y,w[d+g+6]=W.z,w[d+g+7]=0;if(M===!0)W.fromBufferAttribute(m,t),w[d+g+8]=W.x,w[d+g+9]=W.y,w[d+g+10]=W.z,w[d+g+11]=m.itemSize===4?W.w:1}}q={count:V,texture:I,size:new BJ(k,f)},Z.set(X,q),X.addEventListener("dispose",L)}if(K.isInstancedMesh===!0&&K.morphTexture!==null)U.getUniforms().setValue(J,"morphTexture",K.morphTexture,Q);else{let D=0;for(let M=0;M<H.length;M++)D+=H[M];let O=X.morphTargetsRelative?1:1-D;U.getUniforms().setValue(J,"morphTargetBaseInfluence",O),U.getUniforms().setValue(J,"morphTargetInfluences",H)}U.getUniforms().setValue(J,"morphTargetsTexture",q.texture,Q),U.getUniforms().setValue(J,"morphTargetsTextureSize",q.size)}return{update:Y}}function NY(J,$,Q,Z){let W=new WeakMap;function Y(U){let H=Z.render.frame,G=U.geometry,V=$.get(U,G);if(W.get(V)!==H)$.update(V),W.set(V,H);if(U.isInstancedMesh){if(U.hasEventListener("dispose",X)===!1)U.addEventListener("dispose",X);if(W.get(U)!==H){if(Q.update(U.instanceMatrix,J.ARRAY_BUFFER),U.instanceColor!==null)Q.update(U.instanceColor,J.ARRAY_BUFFER);W.set(U,H)}}if(U.isSkinnedMesh){let q=U.skeleton;if(W.get(q)!==H)q.update(),W.set(q,H)}return V}function K(){W=new WeakMap}function X(U){let H=U.target;if(H.removeEventListener("dispose",X),Q.remove(H.instanceMatrix),H.instanceColor!==null)Q.remove(H.instanceColor)}return{update:Y,dispose:K}}class R9 extends L0{constructor(J,$,Q,Z,W,Y,K,X,U,H=1026){if(H!==1026&&H!==1027)throw Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");if(Q===void 0&&H===1026)Q=1014;if(Q===void 0&&H===1027)Q=1020;super(null,Z,W,Y,K,X,H,Q,U);this.isDepthTexture=!0,this.image={width:J,height:$},this.magFilter=K!==void 0?K:1003,this.minFilter=X!==void 0?X:1003,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(J){return super.copy(J),this.compareFunction=J.compareFunction,this}toJSON(J){let $=super.toJSON(J);if(this.compareFunction!==null)$.compareFunction=this.compareFunction;return $}}var X$=new L0,O5=new R9(1,1),U$=new H9,H$=new $$,G$=new F9,M5=[],B5=[],L5=new Float32Array(16),z5=new Float32Array(9),_5=new Float32Array(4);function Z7(J,$,Q){let Z=J[0];if(Z<=0||Z>0)return J;let W=$*Q,Y=M5[W];if(Y===void 0)Y=new Float32Array(W),M5[W]=Y;if($!==0){Z.toArray(Y,0);for(let K=1,X=0;K!==$;++K)X+=Q,J[K].toArray(Y,X)}return Y}function V0(J,$){if(J.length!==$.length)return!1;for(let Q=0,Z=J.length;Q<Z;Q++)if(J[Q]!==$[Q])return!1;return!0}function E0(J,$){for(let Q=0,Z=$.length;Q<Z;Q++)J[Q]=$[Q]}function V8(J,$){let Q=B5[$];if(Q===void 0)Q=new Int32Array($),B5[$]=Q;for(let Z=0;Z!==$;++Z)Q[Z]=J.allocateTextureUnit();return Q}function OY(J,$){let Q=this.cache;if(Q[0]===$)return;J.uniform1f(this.addr,$),Q[0]=$}function MY(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y)J.uniform2f(this.addr,$.x,$.y),Q[0]=$.x,Q[1]=$.y}else{if(V0(Q,$))return;J.uniform2fv(this.addr,$),E0(Q,$)}}function BY(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y||Q[2]!==$.z)J.uniform3f(this.addr,$.x,$.y,$.z),Q[0]=$.x,Q[1]=$.y,Q[2]=$.z}else if($.r!==void 0){if(Q[0]!==$.r||Q[1]!==$.g||Q[2]!==$.b)J.uniform3f(this.addr,$.r,$.g,$.b),Q[0]=$.r,Q[1]=$.g,Q[2]=$.b}else{if(V0(Q,$))return;J.uniform3fv(this.addr,$),E0(Q,$)}}function LY(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y||Q[2]!==$.z||Q[3]!==$.w)J.uniform4f(this.addr,$.x,$.y,$.z,$.w),Q[0]=$.x,Q[1]=$.y,Q[2]=$.z,Q[3]=$.w}else{if(V0(Q,$))return;J.uniform4fv(this.addr,$),E0(Q,$)}}function zY(J,$){let Q=this.cache,Z=$.elements;if(Z===void 0){if(V0(Q,$))return;J.uniformMatrix2fv(this.addr,!1,$),E0(Q,$)}else{if(V0(Q,Z))return;_5.set(Z),J.uniformMatrix2fv(this.addr,!1,_5),E0(Q,Z)}}function _Y(J,$){let Q=this.cache,Z=$.elements;if(Z===void 0){if(V0(Q,$))return;J.uniformMatrix3fv(this.addr,!1,$),E0(Q,$)}else{if(V0(Q,Z))return;z5.set(Z),J.uniformMatrix3fv(this.addr,!1,z5),E0(Q,Z)}}function CY(J,$){let Q=this.cache,Z=$.elements;if(Z===void 0){if(V0(Q,$))return;J.uniformMatrix4fv(this.addr,!1,$),E0(Q,$)}else{if(V0(Q,Z))return;L5.set(Z),J.uniformMatrix4fv(this.addr,!1,L5),E0(Q,Z)}}function kY(J,$){let Q=this.cache;if(Q[0]===$)return;J.uniform1i(this.addr,$),Q[0]=$}function AY(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y)J.uniform2i(this.addr,$.x,$.y),Q[0]=$.x,Q[1]=$.y}else{if(V0(Q,$))return;J.uniform2iv(this.addr,$),E0(Q,$)}}function wY(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y||Q[2]!==$.z)J.uniform3i(this.addr,$.x,$.y,$.z),Q[0]=$.x,Q[1]=$.y,Q[2]=$.z}else{if(V0(Q,$))return;J.uniform3iv(this.addr,$),E0(Q,$)}}function IY(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y||Q[2]!==$.z||Q[3]!==$.w)J.uniform4i(this.addr,$.x,$.y,$.z,$.w),Q[0]=$.x,Q[1]=$.y,Q[2]=$.z,Q[3]=$.w}else{if(V0(Q,$))return;J.uniform4iv(this.addr,$),E0(Q,$)}}function TY(J,$){let Q=this.cache;if(Q[0]===$)return;J.uniform1ui(this.addr,$),Q[0]=$}function PY(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y)J.uniform2ui(this.addr,$.x,$.y),Q[0]=$.x,Q[1]=$.y}else{if(V0(Q,$))return;J.uniform2uiv(this.addr,$),E0(Q,$)}}function SY(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y||Q[2]!==$.z)J.uniform3ui(this.addr,$.x,$.y,$.z),Q[0]=$.x,Q[1]=$.y,Q[2]=$.z}else{if(V0(Q,$))return;J.uniform3uiv(this.addr,$),E0(Q,$)}}function vY(J,$){let Q=this.cache;if($.x!==void 0){if(Q[0]!==$.x||Q[1]!==$.y||Q[2]!==$.z||Q[3]!==$.w)J.uniform4ui(this.addr,$.x,$.y,$.z,$.w),Q[0]=$.x,Q[1]=$.y,Q[2]=$.z,Q[3]=$.w}else{if(V0(Q,$))return;J.uniform4uiv(this.addr,$),E0(Q,$)}}function jY(J,$,Q){let Z=this.cache,W=Q.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;let Y;if(this.type===J.SAMPLER_2D_SHADOW)O5.compareFunction=515,Y=O5;else Y=X$;Q.setTexture2D($||Y,W)}function yY(J,$,Q){let Z=this.cache,W=Q.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;Q.setTexture3D($||H$,W)}function fY(J,$,Q){let Z=this.cache,W=Q.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;Q.setTextureCube($||G$,W)}function hY(J,$,Q){let Z=this.cache,W=Q.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;Q.setTexture2DArray($||U$,W)}function xY(J){switch(J){case 5126:return OY;case 35664:return MY;case 35665:return BY;case 35666:return LY;case 35674:return zY;case 35675:return _Y;case 35676:return CY;case 5124:case 35670:return kY;case 35667:case 35671:return AY;case 35668:case 35672:return wY;case 35669:case 35673:return IY;case 5125:return TY;case 36294:return PY;case 36295:return SY;case 36296:return vY;case 35678:case 36198:case 36298:case 36306:case 35682:return jY;case 35679:case 36299:case 36307:return yY;case 35680:case 36300:case 36308:case 36293:return fY;case 36289:case 36303:case 36311:case 36292:return hY}}function bY(J,$){J.uniform1fv(this.addr,$)}function gY(J,$){let Q=Z7($,this.size,2);J.uniform2fv(this.addr,Q)}function pY(J,$){let Q=Z7($,this.size,3);J.uniform3fv(this.addr,Q)}function lY(J,$){let Q=Z7($,this.size,4);J.uniform4fv(this.addr,Q)}function mY(J,$){let Q=Z7($,this.size,4);J.uniformMatrix2fv(this.addr,!1,Q)}function uY(J,$){let Q=Z7($,this.size,9);J.uniformMatrix3fv(this.addr,!1,Q)}function dY(J,$){let Q=Z7($,this.size,16);J.uniformMatrix4fv(this.addr,!1,Q)}function cY(J,$){J.uniform1iv(this.addr,$)}function nY(J,$){J.uniform2iv(this.addr,$)}function sY(J,$){J.uniform3iv(this.addr,$)}function oY(J,$){J.uniform4iv(this.addr,$)}function iY(J,$){J.uniform1uiv(this.addr,$)}function aY(J,$){J.uniform2uiv(this.addr,$)}function rY(J,$){J.uniform3uiv(this.addr,$)}function tY(J,$){J.uniform4uiv(this.addr,$)}function eY(J,$,Q){let Z=this.cache,W=$.length,Y=V8(Q,W);if(!V0(Z,Y))J.uniform1iv(this.addr,Y),E0(Z,Y);for(let K=0;K!==W;++K)Q.setTexture2D($[K]||X$,Y[K])}function J4(J,$,Q){let Z=this.cache,W=$.length,Y=V8(Q,W);if(!V0(Z,Y))J.uniform1iv(this.addr,Y),E0(Z,Y);for(let K=0;K!==W;++K)Q.setTexture3D($[K]||H$,Y[K])}function $4(J,$,Q){let Z=this.cache,W=$.length,Y=V8(Q,W);if(!V0(Z,Y))J.uniform1iv(this.addr,Y),E0(Z,Y);for(let K=0;K!==W;++K)Q.setTextureCube($[K]||G$,Y[K])}function Q4(J,$,Q){let Z=this.cache,W=$.length,Y=V8(Q,W);if(!V0(Z,Y))J.uniform1iv(this.addr,Y),E0(Z,Y);for(let K=0;K!==W;++K)Q.setTexture2DArray($[K]||U$,Y[K])}function Z4(J){switch(J){case 5126:return bY;case 35664:return gY;case 35665:return pY;case 35666:return lY;case 35674:return mY;case 35675:return uY;case 35676:return dY;case 5124:case 35670:return cY;case 35667:case 35671:return nY;case 35668:case 35672:return sY;case 35669:case 35673:return oY;case 5125:return iY;case 36294:return aY;case 36295:return rY;case 36296:return tY;case 35678:case 36198:case 36298:case 36306:case 35682:return eY;case 35679:case 36299:case 36307:return J4;case 35680:case 36300:case 36308:case 36293:return $4;case 36289:case 36303:case 36311:case 36292:return Q4}}class q${constructor(J,$,Q){this.id=J,this.addr=Q,this.cache=[],this.type=$.type,this.setValue=xY($.type)}}class V${constructor(J,$,Q){this.id=J,this.addr=Q,this.cache=[],this.type=$.type,this.size=$.size,this.setValue=Z4($.type)}}class E${constructor(J){this.id=J,this.seq=[],this.map={}}setValue(J,$,Q){let Z=this.seq;for(let W=0,Y=Z.length;W!==Y;++W){let K=Z[W];K.setValue(J,$[K.id],Q)}}}var t8=/(\w+)(\])?(\[|\.)?/g;function C5(J,$){J.seq.push($),J.map[$.id]=$}function W4(J,$,Q){let Z=J.name,W=Z.length;t8.lastIndex=0;while(!0){let Y=t8.exec(Z),K=t8.lastIndex,X=Y[1],U=Y[2]==="]",H=Y[3];if(U)X=X|0;if(H===void 0||H==="["&&K+2===W){C5(Q,H===void 0?new q$(X,J,$):new V$(X,J,$));break}else{let V=Q.map[X];if(V===void 0)V=new E$(X),C5(Q,V);Q=V}}}class _7{constructor(J,$){this.seq=[],this.map={};let Q=J.getProgramParameter($,J.ACTIVE_UNIFORMS);for(let Z=0;Z<Q;++Z){let W=J.getActiveUniform($,Z),Y=J.getUniformLocation($,W.name);W4(W,Y,this)}}setValue(J,$,Q,Z){let W=this.map[$];if(W!==void 0)W.setValue(J,Q,Z)}setOptional(J,$,Q){let Z=$[Q];if(Z!==void 0)this.setValue(J,Q,Z)}static upload(J,$,Q,Z){for(let W=0,Y=$.length;W!==Y;++W){let K=$[W],X=Q[K.id];if(X.needsUpdate!==!1)K.setValue(J,X.value,Z)}}static seqWithValue(J,$){let Q=[];for(let Z=0,W=J.length;Z!==W;++Z){let Y=J[Z];if(Y.id in $)Q.push(Y)}return Q}}function k5(J,$,Q){let Z=J.createShader($);return J.shaderSource(Z,Q),J.compileShader(Z),Z}var Y4=37297,K4=0;function X4(J,$){let Q=J.split(`
`),Z=[],W=Math.max($-6,0),Y=Math.min($+6,Q.length);for(let K=W;K<Y;K++){let X=K+1;Z.push(`${X===$?">":" "} ${X}: ${Q[K]}`)}return Z.join(`
`)}var A5=new lJ;function U4(J){oJ._getMatrix(A5,oJ.workingColorSpace,J);let $=`mat3( ${A5.elements.map((Q)=>Q.toFixed(4))} )`;switch(oJ.getTransfer(J)){case"linear":return[$,"LinearTransferOETF"];case"srgb":return[$,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",J),[$,"LinearTransferOETF"]}}function w5(J,$,Q){let Z=J.getShaderParameter($,J.COMPILE_STATUS),W=J.getShaderInfoLog($).trim();if(Z&&W==="")return"";let Y=/ERROR: 0:(\d+)/.exec(W);if(Y){let K=parseInt(Y[1]);return Q.toUpperCase()+`

`+W+`

`+X4(J.getShaderSource($),K)}else return W}function H4(J,$){let Q=U4($);return[`vec4 ${J}( vec4 value ) {`,`	return ${Q[1]}( vec4( value.rgb * ${Q[0]}, value.a ) );`,"}"].join(`
`)}function G4(J,$){let Q;switch($){case 1:Q="Linear";break;case 2:Q="Reinhard";break;case 3:Q="Cineon";break;case 4:Q="ACESFilmic";break;case 6:Q="AgX";break;case 7:Q="Neutral";break;case 5:Q="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",$),Q="Linear"}return"vec3 "+J+"( vec3 color ) { return "+Q+"ToneMapping( color ); }"}var e7=new A;function q4(){oJ.getLuminanceCoefficients(e7);let J=e7.x.toFixed(4),$=e7.y.toFixed(4),Q=e7.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${J}, ${$}, ${Q} );`,"\treturn dot( weights, rgb );","}"].join(`
`)}function V4(J){return[J.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",J.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(z7).join(`
`)}function E4(J){let $=[];for(let Q in J){let Z=J[Q];if(Z===!1)continue;$.push("#define "+Q+" "+Z)}return $.join(`
`)}function F4(J,$){let Q={},Z=J.getProgramParameter($,J.ACTIVE_ATTRIBUTES);for(let W=0;W<Z;W++){let Y=J.getActiveAttrib($,W),K=Y.name,X=1;if(Y.type===J.FLOAT_MAT2)X=2;if(Y.type===J.FLOAT_MAT3)X=3;if(Y.type===J.FLOAT_MAT4)X=4;Q[K]={type:Y.type,location:J.getAttribLocation($,K),locationSize:X}}return Q}function z7(J){return J!==""}function I5(J,$){let Q=$.numSpotLightShadows+$.numSpotLightMaps-$.numSpotLightShadowsWithMaps;return J.replace(/NUM_DIR_LIGHTS/g,$.numDirLights).replace(/NUM_SPOT_LIGHTS/g,$.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,$.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,Q).replace(/NUM_RECT_AREA_LIGHTS/g,$.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,$.numPointLights).replace(/NUM_HEMI_LIGHTS/g,$.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,$.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,$.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,$.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,$.numPointLightShadows)}function T5(J,$){return J.replace(/NUM_CLIPPING_PLANES/g,$.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,$.numClippingPlanes-$.numClipIntersection)}var D4=/^[ \t]*#include +<([\w\d./]+)>/gm;function K9(J){return J.replace(D4,N4)}var R4=new Map;function N4(J,$){let Q=uJ[$];if(Q===void 0){let Z=R4.get($);if(Z!==void 0)Q=uJ[Z],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',$,Z);else throw Error("Can not resolve #include <"+$+">")}return K9(Q)}var O4=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function P5(J){return J.replace(O4,M4)}function M4(J,$,Q,Z){let W="";for(let Y=parseInt($);Y<parseInt(Q);Y++)W+=Z.replace(/\[\s*i\s*\]/g,"[ "+Y+" ]").replace(/UNROLLED_LOOP_INDEX/g,Y);return W}function S5(J){let $=`precision ${J.precision} float;
	precision ${J.precision} int;
	precision ${J.precision} sampler2D;
	precision ${J.precision} samplerCube;
	precision ${J.precision} sampler3D;
	precision ${J.precision} sampler2DArray;
	precision ${J.precision} sampler2DShadow;
	precision ${J.precision} samplerCubeShadow;
	precision ${J.precision} sampler2DArrayShadow;
	precision ${J.precision} isampler2D;
	precision ${J.precision} isampler3D;
	precision ${J.precision} isamplerCube;
	precision ${J.precision} isampler2DArray;
	precision ${J.precision} usampler2D;
	precision ${J.precision} usampler3D;
	precision ${J.precision} usamplerCube;
	precision ${J.precision} usampler2DArray;
	`;if(J.precision==="highp")$+=`
#define HIGH_PRECISION`;else if(J.precision==="mediump")$+=`
#define MEDIUM_PRECISION`;else if(J.precision==="lowp")$+=`
#define LOW_PRECISION`;return $}function B4(J){let $="SHADOWMAP_TYPE_BASIC";if(J.shadowMapType===1)$="SHADOWMAP_TYPE_PCF";else if(J.shadowMapType===2)$="SHADOWMAP_TYPE_PCF_SOFT";else if(J.shadowMapType===3)$="SHADOWMAP_TYPE_VSM";return $}function L4(J){let $="ENVMAP_TYPE_CUBE";if(J.envMap)switch(J.envMapMode){case 301:case 302:$="ENVMAP_TYPE_CUBE";break;case 306:$="ENVMAP_TYPE_CUBE_UV";break}return $}function z4(J){let $="ENVMAP_MODE_REFLECTION";if(J.envMap)switch(J.envMapMode){case 302:$="ENVMAP_MODE_REFRACTION";break}return $}function _4(J){let $="ENVMAP_BLENDING_NONE";if(J.envMap)switch(J.combine){case 0:$="ENVMAP_BLENDING_MULTIPLY";break;case 1:$="ENVMAP_BLENDING_MIX";break;case 2:$="ENVMAP_BLENDING_ADD";break}return $}function C4(J){let $=J.envMapCubeUVHeight;if($===null)return null;let Q=Math.log2($)-2,Z=1/$;return{texelWidth:1/(3*Math.max(Math.pow(2,Q),112)),texelHeight:Z,maxMip:Q}}function k4(J,$,Q,Z){let W=J.getContext(),Y=Q.defines,K=Q.vertexShader,X=Q.fragmentShader,U=B4(Q),H=L4(Q),G=z4(Q),V=_4(Q),q=C4(Q),D=V4(Q),O=E4(Y),M=W.createProgram(),F,E,z=Q.glslVersion?"#version "+Q.glslVersion+`
`:"";if(Q.isRawShaderMaterial){if(F=["#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,O].filter(z7).join(`
`),F.length>0)F+=`
`;if(E=["#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,O].filter(z7).join(`
`),E.length>0)E+=`
`}else F=[S5(Q),"#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,O,Q.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",Q.batching?"#define USE_BATCHING":"",Q.batchingColor?"#define USE_BATCHING_COLOR":"",Q.instancing?"#define USE_INSTANCING":"",Q.instancingColor?"#define USE_INSTANCING_COLOR":"",Q.instancingMorph?"#define USE_INSTANCING_MORPH":"",Q.useFog&&Q.fog?"#define USE_FOG":"",Q.useFog&&Q.fogExp2?"#define FOG_EXP2":"",Q.map?"#define USE_MAP":"",Q.envMap?"#define USE_ENVMAP":"",Q.envMap?"#define "+G:"",Q.lightMap?"#define USE_LIGHTMAP":"",Q.aoMap?"#define USE_AOMAP":"",Q.bumpMap?"#define USE_BUMPMAP":"",Q.normalMap?"#define USE_NORMALMAP":"",Q.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",Q.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",Q.displacementMap?"#define USE_DISPLACEMENTMAP":"",Q.emissiveMap?"#define USE_EMISSIVEMAP":"",Q.anisotropy?"#define USE_ANISOTROPY":"",Q.anisotropyMap?"#define USE_ANISOTROPYMAP":"",Q.clearcoatMap?"#define USE_CLEARCOATMAP":"",Q.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",Q.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",Q.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",Q.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",Q.specularMap?"#define USE_SPECULARMAP":"",Q.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",Q.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",Q.roughnessMap?"#define USE_ROUGHNESSMAP":"",Q.metalnessMap?"#define USE_METALNESSMAP":"",Q.alphaMap?"#define USE_ALPHAMAP":"",Q.alphaHash?"#define USE_ALPHAHASH":"",Q.transmission?"#define USE_TRANSMISSION":"",Q.transmissionMap?"#define USE_TRANSMISSIONMAP":"",Q.thicknessMap?"#define USE_THICKNESSMAP":"",Q.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",Q.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",Q.mapUv?"#define MAP_UV "+Q.mapUv:"",Q.alphaMapUv?"#define ALPHAMAP_UV "+Q.alphaMapUv:"",Q.lightMapUv?"#define LIGHTMAP_UV "+Q.lightMapUv:"",Q.aoMapUv?"#define AOMAP_UV "+Q.aoMapUv:"",Q.emissiveMapUv?"#define EMISSIVEMAP_UV "+Q.emissiveMapUv:"",Q.bumpMapUv?"#define BUMPMAP_UV "+Q.bumpMapUv:"",Q.normalMapUv?"#define NORMALMAP_UV "+Q.normalMapUv:"",Q.displacementMapUv?"#define DISPLACEMENTMAP_UV "+Q.displacementMapUv:"",Q.metalnessMapUv?"#define METALNESSMAP_UV "+Q.metalnessMapUv:"",Q.roughnessMapUv?"#define ROUGHNESSMAP_UV "+Q.roughnessMapUv:"",Q.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+Q.anisotropyMapUv:"",Q.clearcoatMapUv?"#define CLEARCOATMAP_UV "+Q.clearcoatMapUv:"",Q.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+Q.clearcoatNormalMapUv:"",Q.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+Q.clearcoatRoughnessMapUv:"",Q.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+Q.iridescenceMapUv:"",Q.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+Q.iridescenceThicknessMapUv:"",Q.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+Q.sheenColorMapUv:"",Q.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+Q.sheenRoughnessMapUv:"",Q.specularMapUv?"#define SPECULARMAP_UV "+Q.specularMapUv:"",Q.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+Q.specularColorMapUv:"",Q.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+Q.specularIntensityMapUv:"",Q.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+Q.transmissionMapUv:"",Q.thicknessMapUv?"#define THICKNESSMAP_UV "+Q.thicknessMapUv:"",Q.vertexTangents&&Q.flatShading===!1?"#define USE_TANGENT":"",Q.vertexColors?"#define USE_COLOR":"",Q.vertexAlphas?"#define USE_COLOR_ALPHA":"",Q.vertexUv1s?"#define USE_UV1":"",Q.vertexUv2s?"#define USE_UV2":"",Q.vertexUv3s?"#define USE_UV3":"",Q.pointsUvs?"#define USE_POINTS_UV":"",Q.flatShading?"#define FLAT_SHADED":"",Q.skinning?"#define USE_SKINNING":"",Q.morphTargets?"#define USE_MORPHTARGETS":"",Q.morphNormals&&Q.flatShading===!1?"#define USE_MORPHNORMALS":"",Q.morphColors?"#define USE_MORPHCOLORS":"",Q.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+Q.morphTextureStride:"",Q.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+Q.morphTargetsCount:"",Q.doubleSided?"#define DOUBLE_SIDED":"",Q.flipSided?"#define FLIP_SIDED":"",Q.shadowMapEnabled?"#define USE_SHADOWMAP":"",Q.shadowMapEnabled?"#define "+U:"",Q.sizeAttenuation?"#define USE_SIZEATTENUATION":"",Q.numLightProbes>0?"#define USE_LIGHT_PROBES":"",Q.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",Q.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","\tattribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","\tattribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","\tuniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","\tattribute vec2 uv1;","#endif","#ifdef USE_UV2","\tattribute vec2 uv2;","#endif","#ifdef USE_UV3","\tattribute vec2 uv3;","#endif","#ifdef USE_TANGENT","\tattribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","\tattribute vec4 color;","#elif defined( USE_COLOR )","\tattribute vec3 color;","#endif","#ifdef USE_SKINNING","\tattribute vec4 skinIndex;","\tattribute vec4 skinWeight;","#endif",`
`].filter(z7).join(`
`),E=[S5(Q),"#define SHADER_TYPE "+Q.shaderType,"#define SHADER_NAME "+Q.shaderName,O,Q.useFog&&Q.fog?"#define USE_FOG":"",Q.useFog&&Q.fogExp2?"#define FOG_EXP2":"",Q.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",Q.map?"#define USE_MAP":"",Q.matcap?"#define USE_MATCAP":"",Q.envMap?"#define USE_ENVMAP":"",Q.envMap?"#define "+H:"",Q.envMap?"#define "+G:"",Q.envMap?"#define "+V:"",q?"#define CUBEUV_TEXEL_WIDTH "+q.texelWidth:"",q?"#define CUBEUV_TEXEL_HEIGHT "+q.texelHeight:"",q?"#define CUBEUV_MAX_MIP "+q.maxMip+".0":"",Q.lightMap?"#define USE_LIGHTMAP":"",Q.aoMap?"#define USE_AOMAP":"",Q.bumpMap?"#define USE_BUMPMAP":"",Q.normalMap?"#define USE_NORMALMAP":"",Q.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",Q.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",Q.emissiveMap?"#define USE_EMISSIVEMAP":"",Q.anisotropy?"#define USE_ANISOTROPY":"",Q.anisotropyMap?"#define USE_ANISOTROPYMAP":"",Q.clearcoat?"#define USE_CLEARCOAT":"",Q.clearcoatMap?"#define USE_CLEARCOATMAP":"",Q.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",Q.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",Q.dispersion?"#define USE_DISPERSION":"",Q.iridescence?"#define USE_IRIDESCENCE":"",Q.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",Q.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",Q.specularMap?"#define USE_SPECULARMAP":"",Q.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",Q.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",Q.roughnessMap?"#define USE_ROUGHNESSMAP":"",Q.metalnessMap?"#define USE_METALNESSMAP":"",Q.alphaMap?"#define USE_ALPHAMAP":"",Q.alphaTest?"#define USE_ALPHATEST":"",Q.alphaHash?"#define USE_ALPHAHASH":"",Q.sheen?"#define USE_SHEEN":"",Q.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",Q.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",Q.transmission?"#define USE_TRANSMISSION":"",Q.transmissionMap?"#define USE_TRANSMISSIONMAP":"",Q.thicknessMap?"#define USE_THICKNESSMAP":"",Q.vertexTangents&&Q.flatShading===!1?"#define USE_TANGENT":"",Q.vertexColors||Q.instancingColor||Q.batchingColor?"#define USE_COLOR":"",Q.vertexAlphas?"#define USE_COLOR_ALPHA":"",Q.vertexUv1s?"#define USE_UV1":"",Q.vertexUv2s?"#define USE_UV2":"",Q.vertexUv3s?"#define USE_UV3":"",Q.pointsUvs?"#define USE_POINTS_UV":"",Q.gradientMap?"#define USE_GRADIENTMAP":"",Q.flatShading?"#define FLAT_SHADED":"",Q.doubleSided?"#define DOUBLE_SIDED":"",Q.flipSided?"#define FLIP_SIDED":"",Q.shadowMapEnabled?"#define USE_SHADOWMAP":"",Q.shadowMapEnabled?"#define "+U:"",Q.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",Q.numLightProbes>0?"#define USE_LIGHT_PROBES":"",Q.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",Q.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",Q.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",Q.reverseDepthBuffer?"#define USE_REVERSEDEPTHBUF":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",Q.toneMapping!==0?"#define TONE_MAPPING":"",Q.toneMapping!==0?uJ.tonemapping_pars_fragment:"",Q.toneMapping!==0?G4("toneMapping",Q.toneMapping):"",Q.dithering?"#define DITHERING":"",Q.opaque?"#define OPAQUE":"",uJ.colorspace_pars_fragment,H4("linearToOutputTexel",Q.outputColorSpace),q4(),Q.useDepthPacking?"#define DEPTH_PACKING "+Q.depthPacking:"",`
`].filter(z7).join(`
`);if(K=K9(K),K=I5(K,Q),K=T5(K,Q),X=K9(X),X=I5(X,Q),X=T5(X,Q),K=P5(K),X=P5(X),Q.isRawShaderMaterial!==!0)z=`#version 300 es
`,F=[D,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+F,E=["#define varying in",Q.glslVersion==="300 es"?"":"layout(location = 0) out highp vec4 pc_fragColor;",Q.glslVersion==="300 es"?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+E;let N=z+F+K,k=z+E+X,f=k5(W,W.VERTEX_SHADER,N),w=k5(W,W.FRAGMENT_SHADER,k);if(W.attachShader(M,f),W.attachShader(M,w),Q.index0AttributeName!==void 0)W.bindAttribLocation(M,0,Q.index0AttributeName);else if(Q.morphTargets===!0)W.bindAttribLocation(M,0,"position");W.linkProgram(M);function I(P){if(J.debug.checkShaderErrors){let l=W.getProgramInfoLog(M).trim(),m=W.getShaderInfoLog(f).trim(),d=W.getShaderInfoLog(w).trim(),t=!0,g=!0;if(W.getProgramParameter(M,W.LINK_STATUS)===!1)if(t=!1,typeof J.debug.onShaderError==="function")J.debug.onShaderError(W,M,f,w);else{let e=w5(W,f,"vertex"),u=w5(W,w,"fragment");console.error("THREE.WebGLProgram: Shader Error "+W.getError()+" - VALIDATE_STATUS "+W.getProgramParameter(M,W.VALIDATE_STATUS)+`

Material Name: `+P.name+`
Material Type: `+P.type+`

Program Info Log: `+l+`
`+e+`
`+u)}else if(l!=="")console.warn("THREE.WebGLProgram: Program Info Log:",l);else if(m===""||d==="")g=!1;if(g)P.diagnostics={runnable:t,programLog:l,vertexShader:{log:m,prefix:F},fragmentShader:{log:d,prefix:E}}}W.deleteShader(f),W.deleteShader(w),x=new _7(W,M),L=F4(W,M)}let x;this.getUniforms=function(){if(x===void 0)I(this);return x};let L;this.getAttributes=function(){if(L===void 0)I(this);return L};let _=Q.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){if(_===!1)_=W.getProgramParameter(M,Y4);return _},this.destroy=function(){Z.releaseStatesOfProgram(this),W.deleteProgram(M),this.program=void 0},this.type=Q.shaderType,this.name=Q.shaderName,this.id=K4++,this.cacheKey=$,this.usedTimes=1,this.program=M,this.vertexShader=f,this.fragmentShader=w,this}var A4=0;class F${constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(J){let{vertexShader:$,fragmentShader:Q}=J,Z=this._getShaderStage($),W=this._getShaderStage(Q),Y=this._getShaderCacheForMaterial(J);if(Y.has(Z)===!1)Y.add(Z),Z.usedTimes++;if(Y.has(W)===!1)Y.add(W),W.usedTimes++;return this}remove(J){let $=this.materialCache.get(J);for(let Q of $)if(Q.usedTimes--,Q.usedTimes===0)this.shaderCache.delete(Q.code);return this.materialCache.delete(J),this}getVertexShaderID(J){return this._getShaderStage(J.vertexShader).id}getFragmentShaderID(J){return this._getShaderStage(J.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(J){let $=this.materialCache,Q=$.get(J);if(Q===void 0)Q=new Set,$.set(J,Q);return Q}_getShaderStage(J){let $=this.shaderCache,Q=$.get(J);if(Q===void 0)Q=new D$(J),$.set(J,Q);return Q}}class D${constructor(J){this.id=A4++,this.code=J,this.usedTimes=0}}function w4(J,$,Q,Z,W,Y,K){let X=new G8,U=new F$,H=new Set,G=[],V=W.logarithmicDepthBuffer,q=W.vertexTextures,D=W.precision,O={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function M(L){if(H.add(L),L===0)return"uv";return`uv${L}`}function F(L,_,P,l,m){let d=l.fog,t=m.geometry,g=L.isMeshStandardMaterial?l.environment:null,e=(L.isMeshStandardMaterial?Q:$).get(L.envMap||g),u=!!e&&e.mapping===306?e.image.height:null,WJ=O[L.type];if(L.precision!==null){if(D=W.getMaxPrecision(L.precision),D!==L.precision)console.warn("THREE.WebGLProgram.getParameters:",L.precision,"not supported, using",D,"instead.")}let HJ=t.morphAttributes.position||t.morphAttributes.normal||t.morphAttributes.color,vJ=HJ!==void 0?HJ.length:0,fJ=0;if(t.morphAttributes.position!==void 0)fJ=1;if(t.morphAttributes.normal!==void 0)fJ=2;if(t.morphAttributes.color!==void 0)fJ=3;let o,JJ,PJ,SJ;if(WJ){let aJ=u0[WJ];o=aJ.vertexShader,JJ=aJ.fragmentShader}else o=L.vertexShader,JJ=L.fragmentShader,U.update(L),PJ=U.getVertexShaderID(L),SJ=U.getFragmentShaderID(L);let UJ=J.getRenderTarget(),T=J.state.buffers.depth.getReversed(),jJ=m.isInstancedMesh===!0,OJ=m.isBatchedMesh===!0,LJ=!!L.map,zJ=!!L.matcap,S=!!e,GJ=!!L.aoMap,yJ=!!L.lightMap,AJ=!!L.bumpMap,YJ=!!L.normalMap,sJ=!!L.displacementMap,DJ=!!L.emissiveMap,wJ=!!L.metalnessMap,C=!!L.roughnessMap,R=L.anisotropy>0,h=L.clearcoat>0,s=L.dispersion>0,a=L.iridescence>0,c=L.sheen>0,FJ=L.transmission>0,KJ=R&&!!L.anisotropyMap,NJ=h&&!!L.clearcoatMap,bJ=h&&!!L.clearcoatNormalMap,QJ=h&&!!L.clearcoatRoughnessMap,RJ=a&&!!L.iridescenceMap,nJ=a&&!!L.iridescenceThicknessMap,hJ=c&&!!L.sheenColorMap,MJ=c&&!!L.sheenRoughnessMap,gJ=!!L.specularMap,dJ=!!L.specularColorMap,X0=!!L.specularIntensityMap,v=FJ&&!!L.transmissionMap,$J=FJ&&!!L.thicknessMap,i=!!L.gradientMap,r=!!L.alphaMap,EJ=L.alphaTest>0,qJ=!!L.alphaHash,mJ=!!L.extensions,U0=0;if(L.toneMapped){if(UJ===null||UJ.isXRRenderTarget===!0)U0=J.toneMapping}let D0={shaderID:WJ,shaderType:L.type,shaderName:L.name,vertexShader:o,fragmentShader:JJ,defines:L.defines,customVertexShaderID:PJ,customFragmentShaderID:SJ,isRawShaderMaterial:L.isRawShaderMaterial===!0,glslVersion:L.glslVersion,precision:D,batching:OJ,batchingColor:OJ&&m._colorsTexture!==null,instancing:jJ,instancingColor:jJ&&m.instanceColor!==null,instancingMorph:jJ&&m.morphTexture!==null,supportsVertexTextures:q,outputColorSpace:UJ===null?J.outputColorSpace:UJ.isXRRenderTarget===!0?UJ.texture.colorSpace:"srgb-linear",alphaToCoverage:!!L.alphaToCoverage,map:LJ,matcap:zJ,envMap:S,envMapMode:S&&e.mapping,envMapCubeUVHeight:u,aoMap:GJ,lightMap:yJ,bumpMap:AJ,normalMap:YJ,displacementMap:q&&sJ,emissiveMap:DJ,normalMapObjectSpace:YJ&&L.normalMapType===1,normalMapTangentSpace:YJ&&L.normalMapType===0,metalnessMap:wJ,roughnessMap:C,anisotropy:R,anisotropyMap:KJ,clearcoat:h,clearcoatMap:NJ,clearcoatNormalMap:bJ,clearcoatRoughnessMap:QJ,dispersion:s,iridescence:a,iridescenceMap:RJ,iridescenceThicknessMap:nJ,sheen:c,sheenColorMap:hJ,sheenRoughnessMap:MJ,specularMap:gJ,specularColorMap:dJ,specularIntensityMap:X0,transmission:FJ,transmissionMap:v,thicknessMap:$J,gradientMap:i,opaque:L.transparent===!1&&L.blending===1&&L.alphaToCoverage===!1,alphaMap:r,alphaTest:EJ,alphaHash:qJ,combine:L.combine,mapUv:LJ&&M(L.map.channel),aoMapUv:GJ&&M(L.aoMap.channel),lightMapUv:yJ&&M(L.lightMap.channel),bumpMapUv:AJ&&M(L.bumpMap.channel),normalMapUv:YJ&&M(L.normalMap.channel),displacementMapUv:sJ&&M(L.displacementMap.channel),emissiveMapUv:DJ&&M(L.emissiveMap.channel),metalnessMapUv:wJ&&M(L.metalnessMap.channel),roughnessMapUv:C&&M(L.roughnessMap.channel),anisotropyMapUv:KJ&&M(L.anisotropyMap.channel),clearcoatMapUv:NJ&&M(L.clearcoatMap.channel),clearcoatNormalMapUv:bJ&&M(L.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:QJ&&M(L.clearcoatRoughnessMap.channel),iridescenceMapUv:RJ&&M(L.iridescenceMap.channel),iridescenceThicknessMapUv:nJ&&M(L.iridescenceThicknessMap.channel),sheenColorMapUv:hJ&&M(L.sheenColorMap.channel),sheenRoughnessMapUv:MJ&&M(L.sheenRoughnessMap.channel),specularMapUv:gJ&&M(L.specularMap.channel),specularColorMapUv:dJ&&M(L.specularColorMap.channel),specularIntensityMapUv:X0&&M(L.specularIntensityMap.channel),transmissionMapUv:v&&M(L.transmissionMap.channel),thicknessMapUv:$J&&M(L.thicknessMap.channel),alphaMapUv:r&&M(L.alphaMap.channel),vertexTangents:!!t.attributes.tangent&&(YJ||R),vertexColors:L.vertexColors,vertexAlphas:L.vertexColors===!0&&!!t.attributes.color&&t.attributes.color.itemSize===4,pointsUvs:m.isPoints===!0&&!!t.attributes.uv&&(LJ||r),fog:!!d,useFog:L.fog===!0,fogExp2:!!d&&d.isFogExp2,flatShading:L.flatShading===!0,sizeAttenuation:L.sizeAttenuation===!0,logarithmicDepthBuffer:V,reverseDepthBuffer:T,skinning:m.isSkinnedMesh===!0,morphTargets:t.morphAttributes.position!==void 0,morphNormals:t.morphAttributes.normal!==void 0,morphColors:t.morphAttributes.color!==void 0,morphTargetsCount:vJ,morphTextureStride:fJ,numDirLights:_.directional.length,numPointLights:_.point.length,numSpotLights:_.spot.length,numSpotLightMaps:_.spotLightMap.length,numRectAreaLights:_.rectArea.length,numHemiLights:_.hemi.length,numDirLightShadows:_.directionalShadowMap.length,numPointLightShadows:_.pointShadowMap.length,numSpotLightShadows:_.spotShadowMap.length,numSpotLightShadowsWithMaps:_.numSpotLightShadowsWithMaps,numLightProbes:_.numLightProbes,numClippingPlanes:K.numPlanes,numClipIntersection:K.numIntersection,dithering:L.dithering,shadowMapEnabled:J.shadowMap.enabled&&P.length>0,shadowMapType:J.shadowMap.type,toneMapping:U0,decodeVideoTexture:LJ&&L.map.isVideoTexture===!0&&oJ.getTransfer(L.map.colorSpace)==="srgb",decodeVideoTextureEmissive:DJ&&L.emissiveMap.isVideoTexture===!0&&oJ.getTransfer(L.emissiveMap.colorSpace)==="srgb",premultipliedAlpha:L.premultipliedAlpha,doubleSided:L.side===2,flipSided:L.side===1,useDepthPacking:L.depthPacking>=0,depthPacking:L.depthPacking||0,index0AttributeName:L.index0AttributeName,extensionClipCullDistance:mJ&&L.extensions.clipCullDistance===!0&&Z.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(mJ&&L.extensions.multiDraw===!0||OJ)&&Z.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:Z.has("KHR_parallel_shader_compile"),customProgramCacheKey:L.customProgramCacheKey()};return D0.vertexUv1s=H.has(1),D0.vertexUv2s=H.has(2),D0.vertexUv3s=H.has(3),H.clear(),D0}function E(L){let _=[];if(L.shaderID)_.push(L.shaderID);else _.push(L.customVertexShaderID),_.push(L.customFragmentShaderID);if(L.defines!==void 0)for(let P in L.defines)_.push(P),_.push(L.defines[P]);if(L.isRawShaderMaterial===!1)z(_,L),N(_,L),_.push(J.outputColorSpace);return _.push(L.customProgramCacheKey),_.join()}function z(L,_){L.push(_.precision),L.push(_.outputColorSpace),L.push(_.envMapMode),L.push(_.envMapCubeUVHeight),L.push(_.mapUv),L.push(_.alphaMapUv),L.push(_.lightMapUv),L.push(_.aoMapUv),L.push(_.bumpMapUv),L.push(_.normalMapUv),L.push(_.displacementMapUv),L.push(_.emissiveMapUv),L.push(_.metalnessMapUv),L.push(_.roughnessMapUv),L.push(_.anisotropyMapUv),L.push(_.clearcoatMapUv),L.push(_.clearcoatNormalMapUv),L.push(_.clearcoatRoughnessMapUv),L.push(_.iridescenceMapUv),L.push(_.iridescenceThicknessMapUv),L.push(_.sheenColorMapUv),L.push(_.sheenRoughnessMapUv),L.push(_.specularMapUv),L.push(_.specularColorMapUv),L.push(_.specularIntensityMapUv),L.push(_.transmissionMapUv),L.push(_.thicknessMapUv),L.push(_.combine),L.push(_.fogExp2),L.push(_.sizeAttenuation),L.push(_.morphTargetsCount),L.push(_.morphAttributeCount),L.push(_.numDirLights),L.push(_.numPointLights),L.push(_.numSpotLights),L.push(_.numSpotLightMaps),L.push(_.numHemiLights),L.push(_.numRectAreaLights),L.push(_.numDirLightShadows),L.push(_.numPointLightShadows),L.push(_.numSpotLightShadows),L.push(_.numSpotLightShadowsWithMaps),L.push(_.numLightProbes),L.push(_.shadowMapType),L.push(_.toneMapping),L.push(_.numClippingPlanes),L.push(_.numClipIntersection),L.push(_.depthPacking)}function N(L,_){if(X.disableAll(),_.supportsVertexTextures)X.enable(0);if(_.instancing)X.enable(1);if(_.instancingColor)X.enable(2);if(_.instancingMorph)X.enable(3);if(_.matcap)X.enable(4);if(_.envMap)X.enable(5);if(_.normalMapObjectSpace)X.enable(6);if(_.normalMapTangentSpace)X.enable(7);if(_.clearcoat)X.enable(8);if(_.iridescence)X.enable(9);if(_.alphaTest)X.enable(10);if(_.vertexColors)X.enable(11);if(_.vertexAlphas)X.enable(12);if(_.vertexUv1s)X.enable(13);if(_.vertexUv2s)X.enable(14);if(_.vertexUv3s)X.enable(15);if(_.vertexTangents)X.enable(16);if(_.anisotropy)X.enable(17);if(_.alphaHash)X.enable(18);if(_.batching)X.enable(19);if(_.dispersion)X.enable(20);if(_.batchingColor)X.enable(21);if(L.push(X.mask),X.disableAll(),_.fog)X.enable(0);if(_.useFog)X.enable(1);if(_.flatShading)X.enable(2);if(_.logarithmicDepthBuffer)X.enable(3);if(_.reverseDepthBuffer)X.enable(4);if(_.skinning)X.enable(5);if(_.morphTargets)X.enable(6);if(_.morphNormals)X.enable(7);if(_.morphColors)X.enable(8);if(_.premultipliedAlpha)X.enable(9);if(_.shadowMapEnabled)X.enable(10);if(_.doubleSided)X.enable(11);if(_.flipSided)X.enable(12);if(_.useDepthPacking)X.enable(13);if(_.dithering)X.enable(14);if(_.transmission)X.enable(15);if(_.sheen)X.enable(16);if(_.opaque)X.enable(17);if(_.pointsUvs)X.enable(18);if(_.decodeVideoTexture)X.enable(19);if(_.decodeVideoTextureEmissive)X.enable(20);if(_.alphaToCoverage)X.enable(21);L.push(X.mask)}function k(L){let _=O[L.type],P;if(_){let l=u0[_];P=NQ.clone(l.uniforms)}else P=L.uniforms;return P}function f(L,_){let P;for(let l=0,m=G.length;l<m;l++){let d=G[l];if(d.cacheKey===_){P=d,++P.usedTimes;break}}if(P===void 0)P=new k4(J,_,L,Y),G.push(P);return P}function w(L){if(--L.usedTimes===0){let _=G.indexOf(L);G[_]=G[G.length-1],G.pop(),L.destroy()}}function I(L){U.remove(L)}function x(){U.dispose()}return{getParameters:F,getProgramCacheKey:E,getUniforms:k,acquireProgram:f,releaseProgram:w,releaseShaderCache:I,programs:G,dispose:x}}function I4(){let J=new WeakMap;function $(K){return J.has(K)}function Q(K){let X=J.get(K);if(X===void 0)X={},J.set(K,X);return X}function Z(K){J.delete(K)}function W(K,X,U){J.get(K)[X]=U}function Y(){J=new WeakMap}return{has:$,get:Q,remove:Z,update:W,dispose:Y}}function T4(J,$){if(J.groupOrder!==$.groupOrder)return J.groupOrder-$.groupOrder;else if(J.renderOrder!==$.renderOrder)return J.renderOrder-$.renderOrder;else if(J.material.id!==$.material.id)return J.material.id-$.material.id;else if(J.z!==$.z)return J.z-$.z;else return J.id-$.id}function v5(J,$){if(J.groupOrder!==$.groupOrder)return J.groupOrder-$.groupOrder;else if(J.renderOrder!==$.renderOrder)return J.renderOrder-$.renderOrder;else if(J.z!==$.z)return $.z-J.z;else return J.id-$.id}function j5(){let J=[],$=0,Q=[],Z=[],W=[];function Y(){$=0,Q.length=0,Z.length=0,W.length=0}function K(V,q,D,O,M,F){let E=J[$];if(E===void 0)E={id:V.id,object:V,geometry:q,material:D,groupOrder:O,renderOrder:V.renderOrder,z:M,group:F},J[$]=E;else E.id=V.id,E.object=V,E.geometry=q,E.material=D,E.groupOrder=O,E.renderOrder=V.renderOrder,E.z=M,E.group=F;return $++,E}function X(V,q,D,O,M,F){let E=K(V,q,D,O,M,F);if(D.transmission>0)Z.push(E);else if(D.transparent===!0)W.push(E);else Q.push(E)}function U(V,q,D,O,M,F){let E=K(V,q,D,O,M,F);if(D.transmission>0)Z.unshift(E);else if(D.transparent===!0)W.unshift(E);else Q.unshift(E)}function H(V,q){if(Q.length>1)Q.sort(V||T4);if(Z.length>1)Z.sort(q||v5);if(W.length>1)W.sort(q||v5)}function G(){for(let V=$,q=J.length;V<q;V++){let D=J[V];if(D.id===null)break;D.id=null,D.object=null,D.geometry=null,D.material=null,D.group=null}}return{opaque:Q,transmissive:Z,transparent:W,init:Y,push:X,unshift:U,finish:G,sort:H}}function P4(){let J=new WeakMap;function $(Z,W){let Y=J.get(Z),K;if(Y===void 0)K=new j5,J.set(Z,[K]);else if(W>=Y.length)K=new j5,Y.push(K);else K=Y[W];return K}function Q(){J=new WeakMap}return{get:$,dispose:Q}}function S4(){let J={};return{get:function($){if(J[$.id]!==void 0)return J[$.id];let Q;switch($.type){case"DirectionalLight":Q={direction:new A,color:new cJ};break;case"SpotLight":Q={position:new A,direction:new A,color:new cJ,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":Q={position:new A,color:new cJ,distance:0,decay:0};break;case"HemisphereLight":Q={direction:new A,skyColor:new cJ,groundColor:new cJ};break;case"RectAreaLight":Q={color:new cJ,position:new A,halfWidth:new A,halfHeight:new A};break}return J[$.id]=Q,Q}}}function v4(){let J={};return{get:function($){if(J[$.id]!==void 0)return J[$.id];let Q;switch($.type){case"DirectionalLight":Q={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new BJ};break;case"SpotLight":Q={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new BJ};break;case"PointLight":Q={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new BJ,shadowCameraNear:1,shadowCameraFar:1000};break}return J[$.id]=Q,Q}}}var j4=0;function y4(J,$){return($.castShadow?2:0)-(J.castShadow?2:0)+($.map?1:0)-(J.map?1:0)}function f4(J){let $=new S4,Q=v4(),Z={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let H=0;H<9;H++)Z.probe.push(new A);let W=new A,Y=new Q0,K=new Q0;function X(H){let G=0,V=0,q=0;for(let L=0;L<9;L++)Z.probe[L].set(0,0,0);let D=0,O=0,M=0,F=0,E=0,z=0,N=0,k=0,f=0,w=0,I=0;H.sort(y4);for(let L=0,_=H.length;L<_;L++){let P=H[L],l=P.color,m=P.intensity,d=P.distance,t=P.shadow&&P.shadow.map?P.shadow.map.texture:null;if(P.isAmbientLight)G+=l.r*m,V+=l.g*m,q+=l.b*m;else if(P.isLightProbe){for(let g=0;g<9;g++)Z.probe[g].addScaledVector(P.sh.coefficients[g],m);I++}else if(P.isDirectionalLight){let g=$.get(P);if(g.color.copy(P.color).multiplyScalar(P.intensity),P.castShadow){let e=P.shadow,u=Q.get(P);u.shadowIntensity=e.intensity,u.shadowBias=e.bias,u.shadowNormalBias=e.normalBias,u.shadowRadius=e.radius,u.shadowMapSize=e.mapSize,Z.directionalShadow[D]=u,Z.directionalShadowMap[D]=t,Z.directionalShadowMatrix[D]=P.shadow.matrix,z++}Z.directional[D]=g,D++}else if(P.isSpotLight){let g=$.get(P);g.position.setFromMatrixPosition(P.matrixWorld),g.color.copy(l).multiplyScalar(m),g.distance=d,g.coneCos=Math.cos(P.angle),g.penumbraCos=Math.cos(P.angle*(1-P.penumbra)),g.decay=P.decay,Z.spot[M]=g;let e=P.shadow;if(P.map){if(Z.spotLightMap[f]=P.map,f++,e.updateMatrices(P),P.castShadow)w++}if(Z.spotLightMatrix[M]=e.matrix,P.castShadow){let u=Q.get(P);u.shadowIntensity=e.intensity,u.shadowBias=e.bias,u.shadowNormalBias=e.normalBias,u.shadowRadius=e.radius,u.shadowMapSize=e.mapSize,Z.spotShadow[M]=u,Z.spotShadowMap[M]=t,k++}M++}else if(P.isRectAreaLight){let g=$.get(P);g.color.copy(l).multiplyScalar(m),g.halfWidth.set(P.width*0.5,0,0),g.halfHeight.set(0,P.height*0.5,0),Z.rectArea[F]=g,F++}else if(P.isPointLight){let g=$.get(P);if(g.color.copy(P.color).multiplyScalar(P.intensity),g.distance=P.distance,g.decay=P.decay,P.castShadow){let e=P.shadow,u=Q.get(P);u.shadowIntensity=e.intensity,u.shadowBias=e.bias,u.shadowNormalBias=e.normalBias,u.shadowRadius=e.radius,u.shadowMapSize=e.mapSize,u.shadowCameraNear=e.camera.near,u.shadowCameraFar=e.camera.far,Z.pointShadow[O]=u,Z.pointShadowMap[O]=t,Z.pointShadowMatrix[O]=P.shadow.matrix,N++}Z.point[O]=g,O++}else if(P.isHemisphereLight){let g=$.get(P);g.skyColor.copy(P.color).multiplyScalar(m),g.groundColor.copy(P.groundColor).multiplyScalar(m),Z.hemi[E]=g,E++}}if(F>0)if(J.has("OES_texture_float_linear")===!0)Z.rectAreaLTC1=XJ.LTC_FLOAT_1,Z.rectAreaLTC2=XJ.LTC_FLOAT_2;else Z.rectAreaLTC1=XJ.LTC_HALF_1,Z.rectAreaLTC2=XJ.LTC_HALF_2;Z.ambient[0]=G,Z.ambient[1]=V,Z.ambient[2]=q;let x=Z.hash;if(x.directionalLength!==D||x.pointLength!==O||x.spotLength!==M||x.rectAreaLength!==F||x.hemiLength!==E||x.numDirectionalShadows!==z||x.numPointShadows!==N||x.numSpotShadows!==k||x.numSpotMaps!==f||x.numLightProbes!==I)Z.directional.length=D,Z.spot.length=M,Z.rectArea.length=F,Z.point.length=O,Z.hemi.length=E,Z.directionalShadow.length=z,Z.directionalShadowMap.length=z,Z.pointShadow.length=N,Z.pointShadowMap.length=N,Z.spotShadow.length=k,Z.spotShadowMap.length=k,Z.directionalShadowMatrix.length=z,Z.pointShadowMatrix.length=N,Z.spotLightMatrix.length=k+f-w,Z.spotLightMap.length=f,Z.numSpotLightShadowsWithMaps=w,Z.numLightProbes=I,x.directionalLength=D,x.pointLength=O,x.spotLength=M,x.rectAreaLength=F,x.hemiLength=E,x.numDirectionalShadows=z,x.numPointShadows=N,x.numSpotShadows=k,x.numSpotMaps=f,x.numLightProbes=I,Z.version=j4++}function U(H,G){let V=0,q=0,D=0,O=0,M=0,F=G.matrixWorldInverse;for(let E=0,z=H.length;E<z;E++){let N=H[E];if(N.isDirectionalLight){let k=Z.directional[V];k.direction.setFromMatrixPosition(N.matrixWorld),W.setFromMatrixPosition(N.target.matrixWorld),k.direction.sub(W),k.direction.transformDirection(F),V++}else if(N.isSpotLight){let k=Z.spot[D];k.position.setFromMatrixPosition(N.matrixWorld),k.position.applyMatrix4(F),k.direction.setFromMatrixPosition(N.matrixWorld),W.setFromMatrixPosition(N.target.matrixWorld),k.direction.sub(W),k.direction.transformDirection(F),D++}else if(N.isRectAreaLight){let k=Z.rectArea[O];k.position.setFromMatrixPosition(N.matrixWorld),k.position.applyMatrix4(F),K.identity(),Y.copy(N.matrixWorld),Y.premultiply(F),K.extractRotation(Y),k.halfWidth.set(N.width*0.5,0,0),k.halfHeight.set(0,N.height*0.5,0),k.halfWidth.applyMatrix4(K),k.halfHeight.applyMatrix4(K),O++}else if(N.isPointLight){let k=Z.point[q];k.position.setFromMatrixPosition(N.matrixWorld),k.position.applyMatrix4(F),q++}else if(N.isHemisphereLight){let k=Z.hemi[M];k.direction.setFromMatrixPosition(N.matrixWorld),k.direction.transformDirection(F),M++}}}return{setup:X,setupView:U,state:Z}}function y5(J){let $=new f4(J),Q=[],Z=[];function W(G){H.camera=G,Q.length=0,Z.length=0}function Y(G){Q.push(G)}function K(G){Z.push(G)}function X(){$.setup(Q)}function U(G){$.setupView(Q,G)}let H={lightsArray:Q,shadowsArray:Z,camera:null,lights:$,transmissionRenderTarget:{}};return{init:W,state:H,setupLights:X,setupLightsView:U,pushLight:Y,pushShadow:K}}function h4(J){let $=new WeakMap;function Q(W,Y=0){let K=$.get(W),X;if(K===void 0)X=new y5(J),$.set(W,[X]);else if(Y>=K.length)X=new y5(J),K.push(X);else X=K[Y];return X}function Z(){$=new WeakMap}return{get:Q,dispose:Z}}class R$ extends S6{static get type(){return"MeshDepthMaterial"}constructor(J){super();this.isMeshDepthMaterial=!0,this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(J)}copy(J){return super.copy(J),this.depthPacking=J.depthPacking,this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this}}class N$ extends S6{static get type(){return"MeshDistanceMaterial"}constructor(J){super();this.isMeshDistanceMaterial=!0,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(J)}copy(J){return super.copy(J),this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this}}var x4=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,b4=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function g4(J,$,Q){let Z=new q8,W=new BJ,Y=new BJ,K=new H0,X=new R$({depthPacking:3201}),U=new N$,H={},G=Q.maxTextureSize,V={[0]:1,[1]:0,[2]:2},q=new Z6({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new BJ},radius:{value:4}},vertexShader:x4,fragmentShader:b4}),D=q.clone();D.defines.HORIZONTAL_PASS=1;let O=new R0;O.setAttribute("position",new k0(new Float32Array([-1,-1,0.5,3,-1,0.5,-1,3,0.5]),3));let M=new TJ(O,q),F=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let E=this.type;this.render=function(w,I,x){if(F.enabled===!1)return;if(F.autoUpdate===!1&&F.needsUpdate===!1)return;if(w.length===0)return;let L=J.getRenderTarget(),_=J.getActiveCubeFace(),P=J.getActiveMipmapLevel(),l=J.state;l.setBlending(0),l.buffers.color.setClear(1,1,1,1),l.buffers.depth.setTest(!0),l.setScissorTest(!1);let m=E!==3&&this.type===3,d=E===3&&this.type!==3;for(let t=0,g=w.length;t<g;t++){let e=w[t],u=e.shadow;if(u===void 0){console.warn("THREE.WebGLShadowMap:",e,"has no shadow.");continue}if(u.autoUpdate===!1&&u.needsUpdate===!1)continue;W.copy(u.mapSize);let WJ=u.getFrameExtents();if(W.multiply(WJ),Y.copy(u.mapSize),W.x>G||W.y>G){if(W.x>G)Y.x=Math.floor(G/WJ.x),W.x=Y.x*WJ.x,u.mapSize.x=Y.x;if(W.y>G)Y.y=Math.floor(G/WJ.y),W.y=Y.y*WJ.y,u.mapSize.y=Y.y}if(u.map===null||m===!0||d===!0){let vJ=this.type!==3?{minFilter:1003,magFilter:1003}:{};if(u.map!==null)u.map.dispose();u.map=new M6(W.x,W.y,vJ),u.map.texture.name=e.name+".shadowMap",u.camera.updateProjectionMatrix()}J.setRenderTarget(u.map),J.clear();let HJ=u.getViewportCount();for(let vJ=0;vJ<HJ;vJ++){let fJ=u.getViewport(vJ);K.set(Y.x*fJ.x,Y.y*fJ.y,Y.x*fJ.z,Y.y*fJ.w),l.viewport(K),u.updateMatrices(e,vJ),Z=u.getFrustum(),k(I,x,u.camera,e,this.type)}if(u.isPointLightShadow!==!0&&this.type===3)z(u,x);u.needsUpdate=!1}E=this.type,F.needsUpdate=!1,J.setRenderTarget(L,_,P)};function z(w,I){let x=$.update(M);if(q.defines.VSM_SAMPLES!==w.blurSamples)q.defines.VSM_SAMPLES=w.blurSamples,D.defines.VSM_SAMPLES=w.blurSamples,q.needsUpdate=!0,D.needsUpdate=!0;if(w.mapPass===null)w.mapPass=new M6(W.x,W.y);q.uniforms.shadow_pass.value=w.map.texture,q.uniforms.resolution.value=w.mapSize,q.uniforms.radius.value=w.radius,J.setRenderTarget(w.mapPass),J.clear(),J.renderBufferDirect(I,null,x,q,M,null),D.uniforms.shadow_pass.value=w.mapPass.texture,D.uniforms.resolution.value=w.mapSize,D.uniforms.radius.value=w.radius,J.setRenderTarget(w.map),J.clear(),J.renderBufferDirect(I,null,x,D,M,null)}function N(w,I,x,L){let _=null,P=x.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(P!==void 0)_=P;else if(_=x.isPointLight===!0?U:X,J.localClippingEnabled&&I.clipShadows===!0&&Array.isArray(I.clippingPlanes)&&I.clippingPlanes.length!==0||I.displacementMap&&I.displacementScale!==0||I.alphaMap&&I.alphaTest>0||I.map&&I.alphaTest>0){let l=_.uuid,m=I.uuid,d=H[l];if(d===void 0)d={},H[l]=d;let t=d[m];if(t===void 0)t=_.clone(),d[m]=t,I.addEventListener("dispose",f);_=t}if(_.visible=I.visible,_.wireframe=I.wireframe,L===3)_.side=I.shadowSide!==null?I.shadowSide:I.side;else _.side=I.shadowSide!==null?I.shadowSide:V[I.side];if(_.alphaMap=I.alphaMap,_.alphaTest=I.alphaTest,_.map=I.map,_.clipShadows=I.clipShadows,_.clippingPlanes=I.clippingPlanes,_.clipIntersection=I.clipIntersection,_.displacementMap=I.displacementMap,_.displacementScale=I.displacementScale,_.displacementBias=I.displacementBias,_.wireframeLinewidth=I.wireframeLinewidth,_.linewidth=I.linewidth,x.isPointLight===!0&&_.isMeshDistanceMaterial===!0){let l=J.properties.get(_);l.light=x}return _}function k(w,I,x,L,_){if(w.visible===!1)return;if(w.layers.test(I.layers)&&(w.isMesh||w.isLine||w.isPoints)){if((w.castShadow||w.receiveShadow&&_===3)&&(!w.frustumCulled||Z.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(x.matrixWorldInverse,w.matrixWorld);let m=$.update(w),d=w.material;if(Array.isArray(d)){let t=m.groups;for(let g=0,e=t.length;g<e;g++){let u=t[g],WJ=d[u.materialIndex];if(WJ&&WJ.visible){let HJ=N(w,WJ,L,_);w.onBeforeShadow(J,w,I,x,m,HJ,u),J.renderBufferDirect(x,null,m,HJ,w,u),w.onAfterShadow(J,w,I,x,m,HJ,u)}}}else if(d.visible){let t=N(w,d,L,_);w.onBeforeShadow(J,w,I,x,m,t,null),J.renderBufferDirect(x,null,m,t,w,null),w.onAfterShadow(J,w,I,x,m,t,null)}}}let l=w.children;for(let m=0,d=l.length;m<d;m++)k(l[m],I,x,L,_)}function f(w){w.target.removeEventListener("dispose",f);for(let x in H){let L=H[x],_=w.target.uuid;if(_ in L)L[_].dispose(),delete L[_]}}}var p4={[0]:1,[2]:6,[4]:7,[3]:5,[1]:0,[6]:2,[7]:4,[5]:3};function l4(J,$){function Q(){let v=!1,$J=new H0,i=null,r=new H0(0,0,0,0);return{setMask:function(EJ){if(i!==EJ&&!v)J.colorMask(EJ,EJ,EJ,EJ),i=EJ},setLocked:function(EJ){v=EJ},setClear:function(EJ,qJ,mJ,U0,D0){if(D0===!0)EJ*=U0,qJ*=U0,mJ*=U0;if($J.set(EJ,qJ,mJ,U0),r.equals($J)===!1)J.clearColor(EJ,qJ,mJ,U0),r.copy($J)},reset:function(){v=!1,i=null,r.set(-1,0,0,0)}}}function Z(){let v=!1,$J=!1,i=null,r=null,EJ=null;return{setReversed:function(qJ){if($J!==qJ){let mJ=$.get("EXT_clip_control");if($J)mJ.clipControlEXT(mJ.LOWER_LEFT_EXT,mJ.ZERO_TO_ONE_EXT);else mJ.clipControlEXT(mJ.LOWER_LEFT_EXT,mJ.NEGATIVE_ONE_TO_ONE_EXT);let U0=EJ;EJ=null,this.setClear(U0)}$J=qJ},getReversed:function(){return $J},setTest:function(qJ){if(qJ)UJ(J.DEPTH_TEST);else T(J.DEPTH_TEST)},setMask:function(qJ){if(i!==qJ&&!v)J.depthMask(qJ),i=qJ},setFunc:function(qJ){if($J)qJ=p4[qJ];if(r!==qJ){switch(qJ){case 0:J.depthFunc(J.NEVER);break;case 1:J.depthFunc(J.ALWAYS);break;case 2:J.depthFunc(J.LESS);break;case 3:J.depthFunc(J.LEQUAL);break;case 4:J.depthFunc(J.EQUAL);break;case 5:J.depthFunc(J.GEQUAL);break;case 6:J.depthFunc(J.GREATER);break;case 7:J.depthFunc(J.NOTEQUAL);break;default:J.depthFunc(J.LEQUAL)}r=qJ}},setLocked:function(qJ){v=qJ},setClear:function(qJ){if(EJ!==qJ){if($J)qJ=1-qJ;J.clearDepth(qJ),EJ=qJ}},reset:function(){v=!1,i=null,r=null,EJ=null,$J=!1}}}function W(){let v=!1,$J=null,i=null,r=null,EJ=null,qJ=null,mJ=null,U0=null,D0=null;return{setTest:function(aJ){if(!v)if(aJ)UJ(J.STENCIL_TEST);else T(J.STENCIL_TEST)},setMask:function(aJ){if($J!==aJ&&!v)J.stencilMask(aJ),$J=aJ},setFunc:function(aJ,i0,l0){if(i!==aJ||r!==i0||EJ!==l0)J.stencilFunc(aJ,i0,l0),i=aJ,r=i0,EJ=l0},setOp:function(aJ,i0,l0){if(qJ!==aJ||mJ!==i0||U0!==l0)J.stencilOp(aJ,i0,l0),qJ=aJ,mJ=i0,U0=l0},setLocked:function(aJ){v=aJ},setClear:function(aJ){if(D0!==aJ)J.clearStencil(aJ),D0=aJ},reset:function(){v=!1,$J=null,i=null,r=null,EJ=null,qJ=null,mJ=null,U0=null,D0=null}}}let Y=new Q,K=new Z,X=new W,U=new WeakMap,H=new WeakMap,G={},V={},q=new WeakMap,D=[],O=null,M=!1,F=null,E=null,z=null,N=null,k=null,f=null,w=null,I=new cJ(0,0,0),x=0,L=!1,_=null,P=null,l=null,m=null,d=null,t=J.getParameter(J.MAX_COMBINED_TEXTURE_IMAGE_UNITS),g=!1,e=0,u=J.getParameter(J.VERSION);if(u.indexOf("WebGL")!==-1)e=parseFloat(/^WebGL (\d)/.exec(u)[1]),g=e>=1;else if(u.indexOf("OpenGL ES")!==-1)e=parseFloat(/^OpenGL ES (\d)/.exec(u)[1]),g=e>=2;let WJ=null,HJ={},vJ=J.getParameter(J.SCISSOR_BOX),fJ=J.getParameter(J.VIEWPORT),o=new H0().fromArray(vJ),JJ=new H0().fromArray(fJ);function PJ(v,$J,i,r){let EJ=new Uint8Array(4),qJ=J.createTexture();J.bindTexture(v,qJ),J.texParameteri(v,J.TEXTURE_MIN_FILTER,J.NEAREST),J.texParameteri(v,J.TEXTURE_MAG_FILTER,J.NEAREST);for(let mJ=0;mJ<i;mJ++)if(v===J.TEXTURE_3D||v===J.TEXTURE_2D_ARRAY)J.texImage3D($J,0,J.RGBA,1,1,r,0,J.RGBA,J.UNSIGNED_BYTE,EJ);else J.texImage2D($J+mJ,0,J.RGBA,1,1,0,J.RGBA,J.UNSIGNED_BYTE,EJ);return qJ}let SJ={};SJ[J.TEXTURE_2D]=PJ(J.TEXTURE_2D,J.TEXTURE_2D,1),SJ[J.TEXTURE_CUBE_MAP]=PJ(J.TEXTURE_CUBE_MAP,J.TEXTURE_CUBE_MAP_POSITIVE_X,6),SJ[J.TEXTURE_2D_ARRAY]=PJ(J.TEXTURE_2D_ARRAY,J.TEXTURE_2D_ARRAY,1,1),SJ[J.TEXTURE_3D]=PJ(J.TEXTURE_3D,J.TEXTURE_3D,1,1),Y.setClear(0,0,0,1),K.setClear(1),X.setClear(0),UJ(J.DEPTH_TEST),K.setFunc(3),AJ(!1),YJ(1),UJ(J.CULL_FACE),GJ(0);function UJ(v){if(G[v]!==!0)J.enable(v),G[v]=!0}function T(v){if(G[v]!==!1)J.disable(v),G[v]=!1}function jJ(v,$J){if(V[v]!==$J){if(J.bindFramebuffer(v,$J),V[v]=$J,v===J.DRAW_FRAMEBUFFER)V[J.FRAMEBUFFER]=$J;if(v===J.FRAMEBUFFER)V[J.DRAW_FRAMEBUFFER]=$J;return!0}return!1}function OJ(v,$J){let i=D,r=!1;if(v){if(i=q.get($J),i===void 0)i=[],q.set($J,i);let EJ=v.textures;if(i.length!==EJ.length||i[0]!==J.COLOR_ATTACHMENT0){for(let qJ=0,mJ=EJ.length;qJ<mJ;qJ++)i[qJ]=J.COLOR_ATTACHMENT0+qJ;i.length=EJ.length,r=!0}}else if(i[0]!==J.BACK)i[0]=J.BACK,r=!0;if(r)J.drawBuffers(i)}function LJ(v){if(O!==v)return J.useProgram(v),O=v,!0;return!1}let zJ={[100]:J.FUNC_ADD,[101]:J.FUNC_SUBTRACT,[102]:J.FUNC_REVERSE_SUBTRACT};zJ[103]=J.MIN,zJ[104]=J.MAX;let S={[200]:J.ZERO,[201]:J.ONE,[202]:J.SRC_COLOR,[204]:J.SRC_ALPHA,[210]:J.SRC_ALPHA_SATURATE,[208]:J.DST_COLOR,[206]:J.DST_ALPHA,[203]:J.ONE_MINUS_SRC_COLOR,[205]:J.ONE_MINUS_SRC_ALPHA,[209]:J.ONE_MINUS_DST_COLOR,[207]:J.ONE_MINUS_DST_ALPHA,[211]:J.CONSTANT_COLOR,[212]:J.ONE_MINUS_CONSTANT_COLOR,[213]:J.CONSTANT_ALPHA,[214]:J.ONE_MINUS_CONSTANT_ALPHA};function GJ(v,$J,i,r,EJ,qJ,mJ,U0,D0,aJ){if(v===0){if(M===!0)T(J.BLEND),M=!1;return}if(M===!1)UJ(J.BLEND),M=!0;if(v!==5){if(v!==F||aJ!==L){if(E!==100||k!==100)J.blendEquation(J.FUNC_ADD),E=100,k=100;if(aJ)switch(v){case 1:J.blendFuncSeparate(J.ONE,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case 2:J.blendFunc(J.ONE,J.ONE);break;case 3:J.blendFuncSeparate(J.ZERO,J.ONE_MINUS_SRC_COLOR,J.ZERO,J.ONE);break;case 4:J.blendFuncSeparate(J.ZERO,J.SRC_COLOR,J.ZERO,J.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",v);break}else switch(v){case 1:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case 2:J.blendFunc(J.SRC_ALPHA,J.ONE);break;case 3:J.blendFuncSeparate(J.ZERO,J.ONE_MINUS_SRC_COLOR,J.ZERO,J.ONE);break;case 4:J.blendFunc(J.ZERO,J.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",v);break}z=null,N=null,f=null,w=null,I.set(0,0,0),x=0,F=v,L=aJ}return}if(EJ=EJ||$J,qJ=qJ||i,mJ=mJ||r,$J!==E||EJ!==k)J.blendEquationSeparate(zJ[$J],zJ[EJ]),E=$J,k=EJ;if(i!==z||r!==N||qJ!==f||mJ!==w)J.blendFuncSeparate(S[i],S[r],S[qJ],S[mJ]),z=i,N=r,f=qJ,w=mJ;if(U0.equals(I)===!1||D0!==x)J.blendColor(U0.r,U0.g,U0.b,D0),I.copy(U0),x=D0;F=v,L=!1}function yJ(v,$J){v.side===2?T(J.CULL_FACE):UJ(J.CULL_FACE);let i=v.side===1;if($J)i=!i;AJ(i),v.blending===1&&v.transparent===!1?GJ(0):GJ(v.blending,v.blendEquation,v.blendSrc,v.blendDst,v.blendEquationAlpha,v.blendSrcAlpha,v.blendDstAlpha,v.blendColor,v.blendAlpha,v.premultipliedAlpha),K.setFunc(v.depthFunc),K.setTest(v.depthTest),K.setMask(v.depthWrite),Y.setMask(v.colorWrite);let r=v.stencilWrite;if(X.setTest(r),r)X.setMask(v.stencilWriteMask),X.setFunc(v.stencilFunc,v.stencilRef,v.stencilFuncMask),X.setOp(v.stencilFail,v.stencilZFail,v.stencilZPass);DJ(v.polygonOffset,v.polygonOffsetFactor,v.polygonOffsetUnits),v.alphaToCoverage===!0?UJ(J.SAMPLE_ALPHA_TO_COVERAGE):T(J.SAMPLE_ALPHA_TO_COVERAGE)}function AJ(v){if(_!==v){if(v)J.frontFace(J.CW);else J.frontFace(J.CCW);_=v}}function YJ(v){if(v!==0){if(UJ(J.CULL_FACE),v!==P)if(v===1)J.cullFace(J.BACK);else if(v===2)J.cullFace(J.FRONT);else J.cullFace(J.FRONT_AND_BACK)}else T(J.CULL_FACE);P=v}function sJ(v){if(v!==l){if(g)J.lineWidth(v);l=v}}function DJ(v,$J,i){if(v){if(UJ(J.POLYGON_OFFSET_FILL),m!==$J||d!==i)J.polygonOffset($J,i),m=$J,d=i}else T(J.POLYGON_OFFSET_FILL)}function wJ(v){if(v)UJ(J.SCISSOR_TEST);else T(J.SCISSOR_TEST)}function C(v){if(v===void 0)v=J.TEXTURE0+t-1;if(WJ!==v)J.activeTexture(v),WJ=v}function R(v,$J,i){if(i===void 0)if(WJ===null)i=J.TEXTURE0+t-1;else i=WJ;let r=HJ[i];if(r===void 0)r={type:void 0,texture:void 0},HJ[i]=r;if(r.type!==v||r.texture!==$J){if(WJ!==i)J.activeTexture(i),WJ=i;J.bindTexture(v,$J||SJ[v]),r.type=v,r.texture=$J}}function h(){let v=HJ[WJ];if(v!==void 0&&v.type!==void 0)J.bindTexture(v.type,null),v.type=void 0,v.texture=void 0}function s(){try{J.compressedTexImage2D.apply(J,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function a(){try{J.compressedTexImage3D.apply(J,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function c(){try{J.texSubImage2D.apply(J,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function FJ(){try{J.texSubImage3D.apply(J,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function KJ(){try{J.compressedTexSubImage2D.apply(J,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function NJ(){try{J.compressedTexSubImage3D.apply(J,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function bJ(){try{J.texStorage2D.apply(J,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function QJ(){try{J.texStorage3D.apply(J,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function RJ(){try{J.texImage2D.apply(J,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function nJ(){try{J.texImage3D.apply(J,arguments)}catch(v){console.error("THREE.WebGLState:",v)}}function hJ(v){if(o.equals(v)===!1)J.scissor(v.x,v.y,v.z,v.w),o.copy(v)}function MJ(v){if(JJ.equals(v)===!1)J.viewport(v.x,v.y,v.z,v.w),JJ.copy(v)}function gJ(v,$J){let i=H.get($J);if(i===void 0)i=new WeakMap,H.set($J,i);let r=i.get(v);if(r===void 0)r=J.getUniformBlockIndex($J,v.name),i.set(v,r)}function dJ(v,$J){let r=H.get($J).get(v);if(U.get($J)!==r)J.uniformBlockBinding($J,r,v.__bindingPointIndex),U.set($J,r)}function X0(){J.disable(J.BLEND),J.disable(J.CULL_FACE),J.disable(J.DEPTH_TEST),J.disable(J.POLYGON_OFFSET_FILL),J.disable(J.SCISSOR_TEST),J.disable(J.STENCIL_TEST),J.disable(J.SAMPLE_ALPHA_TO_COVERAGE),J.blendEquation(J.FUNC_ADD),J.blendFunc(J.ONE,J.ZERO),J.blendFuncSeparate(J.ONE,J.ZERO,J.ONE,J.ZERO),J.blendColor(0,0,0,0),J.colorMask(!0,!0,!0,!0),J.clearColor(0,0,0,0),J.depthMask(!0),J.depthFunc(J.LESS),K.setReversed(!1),J.clearDepth(1),J.stencilMask(4294967295),J.stencilFunc(J.ALWAYS,0,4294967295),J.stencilOp(J.KEEP,J.KEEP,J.KEEP),J.clearStencil(0),J.cullFace(J.BACK),J.frontFace(J.CCW),J.polygonOffset(0,0),J.activeTexture(J.TEXTURE0),J.bindFramebuffer(J.FRAMEBUFFER,null),J.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),J.bindFramebuffer(J.READ_FRAMEBUFFER,null),J.useProgram(null),J.lineWidth(1),J.scissor(0,0,J.canvas.width,J.canvas.height),J.viewport(0,0,J.canvas.width,J.canvas.height),G={},WJ=null,HJ={},V={},q=new WeakMap,D=[],O=null,M=!1,F=null,E=null,z=null,N=null,k=null,f=null,w=null,I=new cJ(0,0,0),x=0,L=!1,_=null,P=null,l=null,m=null,d=null,o.set(0,0,J.canvas.width,J.canvas.height),JJ.set(0,0,J.canvas.width,J.canvas.height),Y.reset(),K.reset(),X.reset()}return{buffers:{color:Y,depth:K,stencil:X},enable:UJ,disable:T,bindFramebuffer:jJ,drawBuffers:OJ,useProgram:LJ,setBlending:GJ,setMaterial:yJ,setFlipSided:AJ,setCullFace:YJ,setLineWidth:sJ,setPolygonOffset:DJ,setScissorTest:wJ,activeTexture:C,bindTexture:R,unbindTexture:h,compressedTexImage2D:s,compressedTexImage3D:a,texImage2D:RJ,texImage3D:nJ,updateUBOMapping:gJ,uniformBlockBinding:dJ,texStorage2D:bJ,texStorage3D:QJ,texSubImage2D:c,texSubImage3D:FJ,compressedTexSubImage2D:KJ,compressedTexSubImage3D:NJ,scissor:hJ,viewport:MJ,reset:X0}}function f5(J,$,Q,Z){let W=m4(Z);switch(Q){case 1021:return J*$;case 1024:return J*$;case 1025:return J*$*2;case 1028:return J*$/W.components*W.byteLength;case 1029:return J*$/W.components*W.byteLength;case 1030:return J*$*2/W.components*W.byteLength;case 1031:return J*$*2/W.components*W.byteLength;case 1022:return J*$*3/W.components*W.byteLength;case 1023:return J*$*4/W.components*W.byteLength;case 1033:return J*$*4/W.components*W.byteLength;case 33776:case 33777:return Math.floor((J+3)/4)*Math.floor(($+3)/4)*8;case 33778:case 33779:return Math.floor((J+3)/4)*Math.floor(($+3)/4)*16;case 35841:case 35843:return Math.max(J,16)*Math.max($,8)/4;case 35840:case 35842:return Math.max(J,8)*Math.max($,8)/2;case 36196:case 37492:return Math.floor((J+3)/4)*Math.floor(($+3)/4)*8;case 37496:return Math.floor((J+3)/4)*Math.floor(($+3)/4)*16;case 37808:return Math.floor((J+3)/4)*Math.floor(($+3)/4)*16;case 37809:return Math.floor((J+4)/5)*Math.floor(($+3)/4)*16;case 37810:return Math.floor((J+4)/5)*Math.floor(($+4)/5)*16;case 37811:return Math.floor((J+5)/6)*Math.floor(($+4)/5)*16;case 37812:return Math.floor((J+5)/6)*Math.floor(($+5)/6)*16;case 37813:return Math.floor((J+7)/8)*Math.floor(($+4)/5)*16;case 37814:return Math.floor((J+7)/8)*Math.floor(($+5)/6)*16;case 37815:return Math.floor((J+7)/8)*Math.floor(($+7)/8)*16;case 37816:return Math.floor((J+9)/10)*Math.floor(($+4)/5)*16;case 37817:return Math.floor((J+9)/10)*Math.floor(($+5)/6)*16;case 37818:return Math.floor((J+9)/10)*Math.floor(($+7)/8)*16;case 37819:return Math.floor((J+9)/10)*Math.floor(($+9)/10)*16;case 37820:return Math.floor((J+11)/12)*Math.floor(($+9)/10)*16;case 37821:return Math.floor((J+11)/12)*Math.floor(($+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(J/4)*Math.ceil($/4)*16;case 36283:case 36284:return Math.ceil(J/4)*Math.ceil($/4)*8;case 36285:case 36286:return Math.ceil(J/4)*Math.ceil($/4)*16}throw Error(`Unable to determine texture byte length for ${Q} format.`)}function m4(J){switch(J){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:return{byteLength:4,components:3}}throw Error(`Unknown texture type ${J}.`)}function u4(J,$,Q,Z,W,Y,K){let X=$.has("WEBGL_multisampled_render_to_texture")?$.get("WEBGL_multisampled_render_to_texture"):null,U=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),H=new BJ,G=new WeakMap,V,q=new WeakMap,D=!1;try{D=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch(C){}function O(C,R){return D?new OffscreenCanvas(C,R):X8("canvas")}function M(C,R,h){let s=1,a=wJ(C);if(a.width>h||a.height>h)s=h/Math.max(a.width,a.height);if(s<1)if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&C instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&C instanceof ImageBitmap||typeof VideoFrame<"u"&&C instanceof VideoFrame){let c=Math.floor(s*a.width),FJ=Math.floor(s*a.height);if(V===void 0)V=O(c,FJ);let KJ=R?O(c,FJ):V;return KJ.width=c,KJ.height=FJ,KJ.getContext("2d").drawImage(C,0,0,c,FJ),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+a.width+"x"+a.height+") to ("+c+"x"+FJ+")."),KJ}else{if("data"in C)console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+a.width+"x"+a.height+").");return C}return C}function F(C){return C.generateMipmaps}function E(C){J.generateMipmap(C)}function z(C){if(C.isWebGLCubeRenderTarget)return J.TEXTURE_CUBE_MAP;if(C.isWebGL3DRenderTarget)return J.TEXTURE_3D;if(C.isWebGLArrayRenderTarget||C.isCompressedArrayTexture)return J.TEXTURE_2D_ARRAY;return J.TEXTURE_2D}function N(C,R,h,s,a=!1){if(C!==null){if(J[C]!==void 0)return J[C];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+C+"'")}let c=R;if(R===J.RED){if(h===J.FLOAT)c=J.R32F;if(h===J.HALF_FLOAT)c=J.R16F;if(h===J.UNSIGNED_BYTE)c=J.R8}if(R===J.RED_INTEGER){if(h===J.UNSIGNED_BYTE)c=J.R8UI;if(h===J.UNSIGNED_SHORT)c=J.R16UI;if(h===J.UNSIGNED_INT)c=J.R32UI;if(h===J.BYTE)c=J.R8I;if(h===J.SHORT)c=J.R16I;if(h===J.INT)c=J.R32I}if(R===J.RG){if(h===J.FLOAT)c=J.RG32F;if(h===J.HALF_FLOAT)c=J.RG16F;if(h===J.UNSIGNED_BYTE)c=J.RG8}if(R===J.RG_INTEGER){if(h===J.UNSIGNED_BYTE)c=J.RG8UI;if(h===J.UNSIGNED_SHORT)c=J.RG16UI;if(h===J.UNSIGNED_INT)c=J.RG32UI;if(h===J.BYTE)c=J.RG8I;if(h===J.SHORT)c=J.RG16I;if(h===J.INT)c=J.RG32I}if(R===J.RGB_INTEGER){if(h===J.UNSIGNED_BYTE)c=J.RGB8UI;if(h===J.UNSIGNED_SHORT)c=J.RGB16UI;if(h===J.UNSIGNED_INT)c=J.RGB32UI;if(h===J.BYTE)c=J.RGB8I;if(h===J.SHORT)c=J.RGB16I;if(h===J.INT)c=J.RGB32I}if(R===J.RGBA_INTEGER){if(h===J.UNSIGNED_BYTE)c=J.RGBA8UI;if(h===J.UNSIGNED_SHORT)c=J.RGBA16UI;if(h===J.UNSIGNED_INT)c=J.RGBA32UI;if(h===J.BYTE)c=J.RGBA8I;if(h===J.SHORT)c=J.RGBA16I;if(h===J.INT)c=J.RGBA32I}if(R===J.RGB){if(h===J.UNSIGNED_INT_5_9_9_9_REV)c=J.RGB9_E5}if(R===J.RGBA){let FJ=a?"linear":oJ.getTransfer(s);if(h===J.FLOAT)c=J.RGBA32F;if(h===J.HALF_FLOAT)c=J.RGBA16F;if(h===J.UNSIGNED_BYTE)c=FJ==="srgb"?J.SRGB8_ALPHA8:J.RGBA8;if(h===J.UNSIGNED_SHORT_4_4_4_4)c=J.RGBA4;if(h===J.UNSIGNED_SHORT_5_5_5_1)c=J.RGB5_A1}if(c===J.R16F||c===J.R32F||c===J.RG16F||c===J.RG32F||c===J.RGBA16F||c===J.RGBA32F)$.get("EXT_color_buffer_float");return c}function k(C,R){let h;if(C){if(R===null||R===1014||R===1020)h=J.DEPTH24_STENCIL8;else if(R===1015)h=J.DEPTH32F_STENCIL8;else if(R===1012)h=J.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")}else if(R===null||R===1014||R===1020)h=J.DEPTH_COMPONENT24;else if(R===1015)h=J.DEPTH_COMPONENT32F;else if(R===1012)h=J.DEPTH_COMPONENT16;return h}function f(C,R){if(F(C)===!0||C.isFramebufferTexture&&C.minFilter!==1003&&C.minFilter!==1006)return Math.log2(Math.max(R.width,R.height))+1;else if(C.mipmaps!==void 0&&C.mipmaps.length>0)return C.mipmaps.length;else if(C.isCompressedTexture&&Array.isArray(C.image))return R.mipmaps.length;else return 1}function w(C){let R=C.target;if(R.removeEventListener("dispose",w),x(R),R.isVideoTexture)G.delete(R)}function I(C){let R=C.target;R.removeEventListener("dispose",I),_(R)}function x(C){let R=Z.get(C);if(R.__webglInit===void 0)return;let h=C.source,s=q.get(h);if(s){let a=s[R.__cacheKey];if(a.usedTimes--,a.usedTimes===0)L(C);if(Object.keys(s).length===0)q.delete(h)}Z.remove(C)}function L(C){let R=Z.get(C);J.deleteTexture(R.__webglTexture);let h=C.source,s=q.get(h);delete s[R.__cacheKey],K.memory.textures--}function _(C){let R=Z.get(C);if(C.depthTexture)C.depthTexture.dispose(),Z.remove(C.depthTexture);if(C.isWebGLCubeRenderTarget)for(let s=0;s<6;s++){if(Array.isArray(R.__webglFramebuffer[s]))for(let a=0;a<R.__webglFramebuffer[s].length;a++)J.deleteFramebuffer(R.__webglFramebuffer[s][a]);else J.deleteFramebuffer(R.__webglFramebuffer[s]);if(R.__webglDepthbuffer)J.deleteRenderbuffer(R.__webglDepthbuffer[s])}else{if(Array.isArray(R.__webglFramebuffer))for(let s=0;s<R.__webglFramebuffer.length;s++)J.deleteFramebuffer(R.__webglFramebuffer[s]);else J.deleteFramebuffer(R.__webglFramebuffer);if(R.__webglDepthbuffer)J.deleteRenderbuffer(R.__webglDepthbuffer);if(R.__webglMultisampledFramebuffer)J.deleteFramebuffer(R.__webglMultisampledFramebuffer);if(R.__webglColorRenderbuffer){for(let s=0;s<R.__webglColorRenderbuffer.length;s++)if(R.__webglColorRenderbuffer[s])J.deleteRenderbuffer(R.__webglColorRenderbuffer[s])}if(R.__webglDepthRenderbuffer)J.deleteRenderbuffer(R.__webglDepthRenderbuffer)}let h=C.textures;for(let s=0,a=h.length;s<a;s++){let c=Z.get(h[s]);if(c.__webglTexture)J.deleteTexture(c.__webglTexture),K.memory.textures--;Z.remove(h[s])}Z.remove(C)}let P=0;function l(){P=0}function m(){let C=P;if(C>=W.maxTextures)console.warn("THREE.WebGLTextures: Trying to use "+C+" texture units while this GPU supports only "+W.maxTextures);return P+=1,C}function d(C){let R=[];return R.push(C.wrapS),R.push(C.wrapT),R.push(C.wrapR||0),R.push(C.magFilter),R.push(C.minFilter),R.push(C.anisotropy),R.push(C.internalFormat),R.push(C.format),R.push(C.type),R.push(C.generateMipmaps),R.push(C.premultiplyAlpha),R.push(C.flipY),R.push(C.unpackAlignment),R.push(C.colorSpace),R.join()}function t(C,R){let h=Z.get(C);if(C.isVideoTexture)sJ(C);if(C.isRenderTargetTexture===!1&&C.version>0&&h.__version!==C.version){let s=C.image;if(s===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(s.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{JJ(h,C,R);return}}Q.bindTexture(J.TEXTURE_2D,h.__webglTexture,J.TEXTURE0+R)}function g(C,R){let h=Z.get(C);if(C.version>0&&h.__version!==C.version){JJ(h,C,R);return}Q.bindTexture(J.TEXTURE_2D_ARRAY,h.__webglTexture,J.TEXTURE0+R)}function e(C,R){let h=Z.get(C);if(C.version>0&&h.__version!==C.version){JJ(h,C,R);return}Q.bindTexture(J.TEXTURE_3D,h.__webglTexture,J.TEXTURE0+R)}function u(C,R){let h=Z.get(C);if(C.version>0&&h.__version!==C.version){PJ(h,C,R);return}Q.bindTexture(J.TEXTURE_CUBE_MAP,h.__webglTexture,J.TEXTURE0+R)}let WJ={[1000]:J.REPEAT,[1001]:J.CLAMP_TO_EDGE,[1002]:J.MIRRORED_REPEAT},HJ={[1003]:J.NEAREST,[1004]:J.NEAREST_MIPMAP_NEAREST,[1005]:J.NEAREST_MIPMAP_LINEAR,[1006]:J.LINEAR,[1007]:J.LINEAR_MIPMAP_NEAREST,[1008]:J.LINEAR_MIPMAP_LINEAR},vJ={[512]:J.NEVER,[519]:J.ALWAYS,[513]:J.LESS,[515]:J.LEQUAL,[514]:J.EQUAL,[518]:J.GEQUAL,[516]:J.GREATER,[517]:J.NOTEQUAL};function fJ(C,R){if(R.type===1015&&$.has("OES_texture_float_linear")===!1&&(R.magFilter===1006||R.magFilter===1007||R.magFilter===1005||R.magFilter===1008||R.minFilter===1006||R.minFilter===1007||R.minFilter===1005||R.minFilter===1008))console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.");if(J.texParameteri(C,J.TEXTURE_WRAP_S,WJ[R.wrapS]),J.texParameteri(C,J.TEXTURE_WRAP_T,WJ[R.wrapT]),C===J.TEXTURE_3D||C===J.TEXTURE_2D_ARRAY)J.texParameteri(C,J.TEXTURE_WRAP_R,WJ[R.wrapR]);if(J.texParameteri(C,J.TEXTURE_MAG_FILTER,HJ[R.magFilter]),J.texParameteri(C,J.TEXTURE_MIN_FILTER,HJ[R.minFilter]),R.compareFunction)J.texParameteri(C,J.TEXTURE_COMPARE_MODE,J.COMPARE_REF_TO_TEXTURE),J.texParameteri(C,J.TEXTURE_COMPARE_FUNC,vJ[R.compareFunction]);if($.has("EXT_texture_filter_anisotropic")===!0){if(R.magFilter===1003)return;if(R.minFilter!==1005&&R.minFilter!==1008)return;if(R.type===1015&&$.has("OES_texture_float_linear")===!1)return;if(R.anisotropy>1||Z.get(R).__currentAnisotropy){let h=$.get("EXT_texture_filter_anisotropic");J.texParameterf(C,h.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(R.anisotropy,W.getMaxAnisotropy())),Z.get(R).__currentAnisotropy=R.anisotropy}}}function o(C,R){let h=!1;if(C.__webglInit===void 0)C.__webglInit=!0,R.addEventListener("dispose",w);let s=R.source,a=q.get(s);if(a===void 0)a={},q.set(s,a);let c=d(R);if(c!==C.__cacheKey){if(a[c]===void 0)a[c]={texture:J.createTexture(),usedTimes:0},K.memory.textures++,h=!0;a[c].usedTimes++;let FJ=a[C.__cacheKey];if(FJ!==void 0){if(a[C.__cacheKey].usedTimes--,FJ.usedTimes===0)L(R)}C.__cacheKey=c,C.__webglTexture=a[c].texture}return h}function JJ(C,R,h){let s=J.TEXTURE_2D;if(R.isDataArrayTexture||R.isCompressedArrayTexture)s=J.TEXTURE_2D_ARRAY;if(R.isData3DTexture)s=J.TEXTURE_3D;let a=o(C,R),c=R.source;Q.bindTexture(s,C.__webglTexture,J.TEXTURE0+h);let FJ=Z.get(c);if(c.version!==FJ.__version||a===!0){Q.activeTexture(J.TEXTURE0+h);let KJ=oJ.getPrimaries(oJ.workingColorSpace),NJ=R.colorSpace===""?null:oJ.getPrimaries(R.colorSpace),bJ=R.colorSpace===""||KJ===NJ?J.NONE:J.BROWSER_DEFAULT_WEBGL;J.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,R.flipY),J.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),J.pixelStorei(J.UNPACK_ALIGNMENT,R.unpackAlignment),J.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,bJ);let QJ=M(R.image,!1,W.maxTextureSize);QJ=DJ(R,QJ);let RJ=Y.convert(R.format,R.colorSpace),nJ=Y.convert(R.type),hJ=N(R.internalFormat,RJ,nJ,R.colorSpace,R.isVideoTexture);fJ(s,R);let MJ,gJ=R.mipmaps,dJ=R.isVideoTexture!==!0,X0=FJ.__version===void 0||a===!0,v=c.dataReady,$J=f(R,QJ);if(R.isDepthTexture){if(hJ=k(R.format===1027,R.type),X0)if(dJ)Q.texStorage2D(J.TEXTURE_2D,1,hJ,QJ.width,QJ.height);else Q.texImage2D(J.TEXTURE_2D,0,hJ,QJ.width,QJ.height,0,RJ,nJ,null)}else if(R.isDataTexture)if(gJ.length>0){if(dJ&&X0)Q.texStorage2D(J.TEXTURE_2D,$J,hJ,gJ[0].width,gJ[0].height);for(let i=0,r=gJ.length;i<r;i++)if(MJ=gJ[i],dJ){if(v)Q.texSubImage2D(J.TEXTURE_2D,i,0,0,MJ.width,MJ.height,RJ,nJ,MJ.data)}else Q.texImage2D(J.TEXTURE_2D,i,hJ,MJ.width,MJ.height,0,RJ,nJ,MJ.data);R.generateMipmaps=!1}else if(dJ){if(X0)Q.texStorage2D(J.TEXTURE_2D,$J,hJ,QJ.width,QJ.height);if(v)Q.texSubImage2D(J.TEXTURE_2D,0,0,0,QJ.width,QJ.height,RJ,nJ,QJ.data)}else Q.texImage2D(J.TEXTURE_2D,0,hJ,QJ.width,QJ.height,0,RJ,nJ,QJ.data);else if(R.isCompressedTexture)if(R.isCompressedArrayTexture){if(dJ&&X0)Q.texStorage3D(J.TEXTURE_2D_ARRAY,$J,hJ,gJ[0].width,gJ[0].height,QJ.depth);for(let i=0,r=gJ.length;i<r;i++)if(MJ=gJ[i],R.format!==1023)if(RJ!==null)if(dJ){if(v)if(R.layerUpdates.size>0){let EJ=f5(MJ.width,MJ.height,R.format,R.type);for(let qJ of R.layerUpdates){let mJ=MJ.data.subarray(qJ*EJ/MJ.data.BYTES_PER_ELEMENT,(qJ+1)*EJ/MJ.data.BYTES_PER_ELEMENT);Q.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,i,0,0,qJ,MJ.width,MJ.height,1,RJ,mJ)}R.clearLayerUpdates()}else Q.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,i,0,0,0,MJ.width,MJ.height,QJ.depth,RJ,MJ.data)}else Q.compressedTexImage3D(J.TEXTURE_2D_ARRAY,i,hJ,MJ.width,MJ.height,QJ.depth,0,MJ.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(dJ){if(v)Q.texSubImage3D(J.TEXTURE_2D_ARRAY,i,0,0,0,MJ.width,MJ.height,QJ.depth,RJ,nJ,MJ.data)}else Q.texImage3D(J.TEXTURE_2D_ARRAY,i,hJ,MJ.width,MJ.height,QJ.depth,0,RJ,nJ,MJ.data)}else{if(dJ&&X0)Q.texStorage2D(J.TEXTURE_2D,$J,hJ,gJ[0].width,gJ[0].height);for(let i=0,r=gJ.length;i<r;i++)if(MJ=gJ[i],R.format!==1023)if(RJ!==null)if(dJ){if(v)Q.compressedTexSubImage2D(J.TEXTURE_2D,i,0,0,MJ.width,MJ.height,RJ,MJ.data)}else Q.compressedTexImage2D(J.TEXTURE_2D,i,hJ,MJ.width,MJ.height,0,MJ.data);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(dJ){if(v)Q.texSubImage2D(J.TEXTURE_2D,i,0,0,MJ.width,MJ.height,RJ,nJ,MJ.data)}else Q.texImage2D(J.TEXTURE_2D,i,hJ,MJ.width,MJ.height,0,RJ,nJ,MJ.data)}else if(R.isDataArrayTexture)if(dJ){if(X0)Q.texStorage3D(J.TEXTURE_2D_ARRAY,$J,hJ,QJ.width,QJ.height,QJ.depth);if(v)if(R.layerUpdates.size>0){let i=f5(QJ.width,QJ.height,R.format,R.type);for(let r of R.layerUpdates){let EJ=QJ.data.subarray(r*i/QJ.data.BYTES_PER_ELEMENT,(r+1)*i/QJ.data.BYTES_PER_ELEMENT);Q.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,r,QJ.width,QJ.height,1,RJ,nJ,EJ)}R.clearLayerUpdates()}else Q.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,0,QJ.width,QJ.height,QJ.depth,RJ,nJ,QJ.data)}else Q.texImage3D(J.TEXTURE_2D_ARRAY,0,hJ,QJ.width,QJ.height,QJ.depth,0,RJ,nJ,QJ.data);else if(R.isData3DTexture)if(dJ){if(X0)Q.texStorage3D(J.TEXTURE_3D,$J,hJ,QJ.width,QJ.height,QJ.depth);if(v)Q.texSubImage3D(J.TEXTURE_3D,0,0,0,0,QJ.width,QJ.height,QJ.depth,RJ,nJ,QJ.data)}else Q.texImage3D(J.TEXTURE_3D,0,hJ,QJ.width,QJ.height,QJ.depth,0,RJ,nJ,QJ.data);else if(R.isFramebufferTexture){if(X0)if(dJ)Q.texStorage2D(J.TEXTURE_2D,$J,hJ,QJ.width,QJ.height);else{let{width:i,height:r}=QJ;for(let EJ=0;EJ<$J;EJ++)Q.texImage2D(J.TEXTURE_2D,EJ,hJ,i,r,0,RJ,nJ,null),i>>=1,r>>=1}}else if(gJ.length>0){if(dJ&&X0){let i=wJ(gJ[0]);Q.texStorage2D(J.TEXTURE_2D,$J,hJ,i.width,i.height)}for(let i=0,r=gJ.length;i<r;i++)if(MJ=gJ[i],dJ){if(v)Q.texSubImage2D(J.TEXTURE_2D,i,0,0,RJ,nJ,MJ)}else Q.texImage2D(J.TEXTURE_2D,i,hJ,RJ,nJ,MJ);R.generateMipmaps=!1}else if(dJ){if(X0){let i=wJ(QJ);Q.texStorage2D(J.TEXTURE_2D,$J,hJ,i.width,i.height)}if(v)Q.texSubImage2D(J.TEXTURE_2D,0,0,0,RJ,nJ,QJ)}else Q.texImage2D(J.TEXTURE_2D,0,hJ,RJ,nJ,QJ);if(F(R))E(s);if(FJ.__version=c.version,R.onUpdate)R.onUpdate(R)}C.__version=R.version}function PJ(C,R,h){if(R.image.length!==6)return;let s=o(C,R),a=R.source;Q.bindTexture(J.TEXTURE_CUBE_MAP,C.__webglTexture,J.TEXTURE0+h);let c=Z.get(a);if(a.version!==c.__version||s===!0){Q.activeTexture(J.TEXTURE0+h);let FJ=oJ.getPrimaries(oJ.workingColorSpace),KJ=R.colorSpace===""?null:oJ.getPrimaries(R.colorSpace),NJ=R.colorSpace===""||FJ===KJ?J.NONE:J.BROWSER_DEFAULT_WEBGL;J.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,R.flipY),J.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,R.premultiplyAlpha),J.pixelStorei(J.UNPACK_ALIGNMENT,R.unpackAlignment),J.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,NJ);let bJ=R.isCompressedTexture||R.image[0].isCompressedTexture,QJ=R.image[0]&&R.image[0].isDataTexture,RJ=[];for(let r=0;r<6;r++){if(!bJ&&!QJ)RJ[r]=M(R.image[r],!0,W.maxCubemapSize);else RJ[r]=QJ?R.image[r].image:R.image[r];RJ[r]=DJ(R,RJ[r])}let nJ=RJ[0],hJ=Y.convert(R.format,R.colorSpace),MJ=Y.convert(R.type),gJ=N(R.internalFormat,hJ,MJ,R.colorSpace),dJ=R.isVideoTexture!==!0,X0=c.__version===void 0||s===!0,v=a.dataReady,$J=f(R,nJ);fJ(J.TEXTURE_CUBE_MAP,R);let i;if(bJ){if(dJ&&X0)Q.texStorage2D(J.TEXTURE_CUBE_MAP,$J,gJ,nJ.width,nJ.height);for(let r=0;r<6;r++){i=RJ[r].mipmaps;for(let EJ=0;EJ<i.length;EJ++){let qJ=i[EJ];if(R.format!==1023)if(hJ!==null)if(dJ){if(v)Q.compressedTexSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ,0,0,qJ.width,qJ.height,hJ,qJ.data)}else Q.compressedTexImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ,gJ,qJ.width,qJ.height,0,qJ.data);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()");else if(dJ){if(v)Q.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ,0,0,qJ.width,qJ.height,hJ,MJ,qJ.data)}else Q.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ,gJ,qJ.width,qJ.height,0,hJ,MJ,qJ.data)}}}else{if(i=R.mipmaps,dJ&&X0){if(i.length>0)$J++;let r=wJ(RJ[0]);Q.texStorage2D(J.TEXTURE_CUBE_MAP,$J,gJ,r.width,r.height)}for(let r=0;r<6;r++)if(QJ){if(dJ){if(v)Q.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,0,0,0,RJ[r].width,RJ[r].height,hJ,MJ,RJ[r].data)}else Q.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,0,gJ,RJ[r].width,RJ[r].height,0,hJ,MJ,RJ[r].data);for(let EJ=0;EJ<i.length;EJ++){let mJ=i[EJ].image[r].image;if(dJ){if(v)Q.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ+1,0,0,mJ.width,mJ.height,hJ,MJ,mJ.data)}else Q.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ+1,gJ,mJ.width,mJ.height,0,hJ,MJ,mJ.data)}}else{if(dJ){if(v)Q.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,0,0,0,hJ,MJ,RJ[r])}else Q.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,0,gJ,hJ,MJ,RJ[r]);for(let EJ=0;EJ<i.length;EJ++){let qJ=i[EJ];if(dJ){if(v)Q.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ+1,0,0,hJ,MJ,qJ.image[r])}else Q.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+r,EJ+1,gJ,hJ,MJ,qJ.image[r])}}}if(F(R))E(J.TEXTURE_CUBE_MAP);if(c.__version=a.version,R.onUpdate)R.onUpdate(R)}C.__version=R.version}function SJ(C,R,h,s,a,c){let FJ=Y.convert(h.format,h.colorSpace),KJ=Y.convert(h.type),NJ=N(h.internalFormat,FJ,KJ,h.colorSpace),bJ=Z.get(R),QJ=Z.get(h);if(QJ.__renderTarget=R,!bJ.__hasExternalTextures){let RJ=Math.max(1,R.width>>c),nJ=Math.max(1,R.height>>c);if(a===J.TEXTURE_3D||a===J.TEXTURE_2D_ARRAY)Q.texImage3D(a,c,NJ,RJ,nJ,R.depth,0,FJ,KJ,null);else Q.texImage2D(a,c,NJ,RJ,nJ,0,FJ,KJ,null)}if(Q.bindFramebuffer(J.FRAMEBUFFER,C),YJ(R))X.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,s,a,QJ.__webglTexture,0,AJ(R));else if(a===J.TEXTURE_2D||a>=J.TEXTURE_CUBE_MAP_POSITIVE_X&&a<=J.TEXTURE_CUBE_MAP_NEGATIVE_Z)J.framebufferTexture2D(J.FRAMEBUFFER,s,a,QJ.__webglTexture,c);Q.bindFramebuffer(J.FRAMEBUFFER,null)}function UJ(C,R,h){if(J.bindRenderbuffer(J.RENDERBUFFER,C),R.depthBuffer){let s=R.depthTexture,a=s&&s.isDepthTexture?s.type:null,c=k(R.stencilBuffer,a),FJ=R.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,KJ=AJ(R);if(YJ(R))X.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,KJ,c,R.width,R.height);else if(h)J.renderbufferStorageMultisample(J.RENDERBUFFER,KJ,c,R.width,R.height);else J.renderbufferStorage(J.RENDERBUFFER,c,R.width,R.height);J.framebufferRenderbuffer(J.FRAMEBUFFER,FJ,J.RENDERBUFFER,C)}else{let s=R.textures;for(let a=0;a<s.length;a++){let c=s[a],FJ=Y.convert(c.format,c.colorSpace),KJ=Y.convert(c.type),NJ=N(c.internalFormat,FJ,KJ,c.colorSpace),bJ=AJ(R);if(h&&YJ(R)===!1)J.renderbufferStorageMultisample(J.RENDERBUFFER,bJ,NJ,R.width,R.height);else if(YJ(R))X.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,bJ,NJ,R.width,R.height);else J.renderbufferStorage(J.RENDERBUFFER,NJ,R.width,R.height)}}J.bindRenderbuffer(J.RENDERBUFFER,null)}function T(C,R){if(R&&R.isWebGLCubeRenderTarget)throw Error("Depth Texture with cube render targets is not supported");if(Q.bindFramebuffer(J.FRAMEBUFFER,C),!(R.depthTexture&&R.depthTexture.isDepthTexture))throw Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let s=Z.get(R.depthTexture);if(s.__renderTarget=R,!s.__webglTexture||R.depthTexture.image.width!==R.width||R.depthTexture.image.height!==R.height)R.depthTexture.image.width=R.width,R.depthTexture.image.height=R.height,R.depthTexture.needsUpdate=!0;t(R.depthTexture,0);let a=s.__webglTexture,c=AJ(R);if(R.depthTexture.format===1026)if(YJ(R))X.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,J.DEPTH_ATTACHMENT,J.TEXTURE_2D,a,0,c);else J.framebufferTexture2D(J.FRAMEBUFFER,J.DEPTH_ATTACHMENT,J.TEXTURE_2D,a,0);else if(R.depthTexture.format===1027)if(YJ(R))X.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,J.DEPTH_STENCIL_ATTACHMENT,J.TEXTURE_2D,a,0,c);else J.framebufferTexture2D(J.FRAMEBUFFER,J.DEPTH_STENCIL_ATTACHMENT,J.TEXTURE_2D,a,0);else throw Error("Unknown depthTexture format")}function jJ(C){let R=Z.get(C),h=C.isWebGLCubeRenderTarget===!0;if(R.__boundDepthTexture!==C.depthTexture){let s=C.depthTexture;if(R.__depthDisposeCallback)R.__depthDisposeCallback();if(s){let a=()=>{delete R.__boundDepthTexture,delete R.__depthDisposeCallback,s.removeEventListener("dispose",a)};s.addEventListener("dispose",a),R.__depthDisposeCallback=a}R.__boundDepthTexture=s}if(C.depthTexture&&!R.__autoAllocateDepthBuffer){if(h)throw Error("target.depthTexture not supported in Cube render targets");T(R.__webglFramebuffer,C)}else if(h){R.__webglDepthbuffer=[];for(let s=0;s<6;s++)if(Q.bindFramebuffer(J.FRAMEBUFFER,R.__webglFramebuffer[s]),R.__webglDepthbuffer[s]===void 0)R.__webglDepthbuffer[s]=J.createRenderbuffer(),UJ(R.__webglDepthbuffer[s],C,!1);else{let a=C.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,c=R.__webglDepthbuffer[s];J.bindRenderbuffer(J.RENDERBUFFER,c),J.framebufferRenderbuffer(J.FRAMEBUFFER,a,J.RENDERBUFFER,c)}}else if(Q.bindFramebuffer(J.FRAMEBUFFER,R.__webglFramebuffer),R.__webglDepthbuffer===void 0)R.__webglDepthbuffer=J.createRenderbuffer(),UJ(R.__webglDepthbuffer,C,!1);else{let s=C.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,a=R.__webglDepthbuffer;J.bindRenderbuffer(J.RENDERBUFFER,a),J.framebufferRenderbuffer(J.FRAMEBUFFER,s,J.RENDERBUFFER,a)}Q.bindFramebuffer(J.FRAMEBUFFER,null)}function OJ(C,R,h){let s=Z.get(C);if(R!==void 0)SJ(s.__webglFramebuffer,C,C.texture,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,0);if(h!==void 0)jJ(C)}function LJ(C){let R=C.texture,h=Z.get(C),s=Z.get(R);C.addEventListener("dispose",I);let a=C.textures,c=C.isWebGLCubeRenderTarget===!0,FJ=a.length>1;if(!FJ){if(s.__webglTexture===void 0)s.__webglTexture=J.createTexture();s.__version=R.version,K.memory.textures++}if(c){h.__webglFramebuffer=[];for(let KJ=0;KJ<6;KJ++)if(R.mipmaps&&R.mipmaps.length>0){h.__webglFramebuffer[KJ]=[];for(let NJ=0;NJ<R.mipmaps.length;NJ++)h.__webglFramebuffer[KJ][NJ]=J.createFramebuffer()}else h.__webglFramebuffer[KJ]=J.createFramebuffer()}else{if(R.mipmaps&&R.mipmaps.length>0){h.__webglFramebuffer=[];for(let KJ=0;KJ<R.mipmaps.length;KJ++)h.__webglFramebuffer[KJ]=J.createFramebuffer()}else h.__webglFramebuffer=J.createFramebuffer();if(FJ)for(let KJ=0,NJ=a.length;KJ<NJ;KJ++){let bJ=Z.get(a[KJ]);if(bJ.__webglTexture===void 0)bJ.__webglTexture=J.createTexture(),K.memory.textures++}if(C.samples>0&&YJ(C)===!1){h.__webglMultisampledFramebuffer=J.createFramebuffer(),h.__webglColorRenderbuffer=[],Q.bindFramebuffer(J.FRAMEBUFFER,h.__webglMultisampledFramebuffer);for(let KJ=0;KJ<a.length;KJ++){let NJ=a[KJ];h.__webglColorRenderbuffer[KJ]=J.createRenderbuffer(),J.bindRenderbuffer(J.RENDERBUFFER,h.__webglColorRenderbuffer[KJ]);let bJ=Y.convert(NJ.format,NJ.colorSpace),QJ=Y.convert(NJ.type),RJ=N(NJ.internalFormat,bJ,QJ,NJ.colorSpace,C.isXRRenderTarget===!0),nJ=AJ(C);J.renderbufferStorageMultisample(J.RENDERBUFFER,nJ,RJ,C.width,C.height),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+KJ,J.RENDERBUFFER,h.__webglColorRenderbuffer[KJ])}if(J.bindRenderbuffer(J.RENDERBUFFER,null),C.depthBuffer)h.__webglDepthRenderbuffer=J.createRenderbuffer(),UJ(h.__webglDepthRenderbuffer,C,!0);Q.bindFramebuffer(J.FRAMEBUFFER,null)}}if(c){Q.bindTexture(J.TEXTURE_CUBE_MAP,s.__webglTexture),fJ(J.TEXTURE_CUBE_MAP,R);for(let KJ=0;KJ<6;KJ++)if(R.mipmaps&&R.mipmaps.length>0)for(let NJ=0;NJ<R.mipmaps.length;NJ++)SJ(h.__webglFramebuffer[KJ][NJ],C,R,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+KJ,NJ);else SJ(h.__webglFramebuffer[KJ],C,R,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+KJ,0);if(F(R))E(J.TEXTURE_CUBE_MAP);Q.unbindTexture()}else if(FJ){for(let KJ=0,NJ=a.length;KJ<NJ;KJ++){let bJ=a[KJ],QJ=Z.get(bJ);if(Q.bindTexture(J.TEXTURE_2D,QJ.__webglTexture),fJ(J.TEXTURE_2D,bJ),SJ(h.__webglFramebuffer,C,bJ,J.COLOR_ATTACHMENT0+KJ,J.TEXTURE_2D,0),F(bJ))E(J.TEXTURE_2D)}Q.unbindTexture()}else{let KJ=J.TEXTURE_2D;if(C.isWebGL3DRenderTarget||C.isWebGLArrayRenderTarget)KJ=C.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if(Q.bindTexture(KJ,s.__webglTexture),fJ(KJ,R),R.mipmaps&&R.mipmaps.length>0)for(let NJ=0;NJ<R.mipmaps.length;NJ++)SJ(h.__webglFramebuffer[NJ],C,R,J.COLOR_ATTACHMENT0,KJ,NJ);else SJ(h.__webglFramebuffer,C,R,J.COLOR_ATTACHMENT0,KJ,0);if(F(R))E(KJ);Q.unbindTexture()}if(C.depthBuffer)jJ(C)}function zJ(C){let R=C.textures;for(let h=0,s=R.length;h<s;h++){let a=R[h];if(F(a)){let c=z(C),FJ=Z.get(a).__webglTexture;Q.bindTexture(c,FJ),E(c),Q.unbindTexture()}}}let S=[],GJ=[];function yJ(C){if(C.samples>0){if(YJ(C)===!1){let{textures:R,width:h,height:s}=C,a=J.COLOR_BUFFER_BIT,c=C.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,FJ=Z.get(C),KJ=R.length>1;if(KJ)for(let NJ=0;NJ<R.length;NJ++)Q.bindFramebuffer(J.FRAMEBUFFER,FJ.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+NJ,J.RENDERBUFFER,null),Q.bindFramebuffer(J.FRAMEBUFFER,FJ.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+NJ,J.TEXTURE_2D,null,0);Q.bindFramebuffer(J.READ_FRAMEBUFFER,FJ.__webglMultisampledFramebuffer),Q.bindFramebuffer(J.DRAW_FRAMEBUFFER,FJ.__webglFramebuffer);for(let NJ=0;NJ<R.length;NJ++){if(C.resolveDepthBuffer){if(C.depthBuffer)a|=J.DEPTH_BUFFER_BIT;if(C.stencilBuffer&&C.resolveStencilBuffer)a|=J.STENCIL_BUFFER_BIT}if(KJ){J.framebufferRenderbuffer(J.READ_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.RENDERBUFFER,FJ.__webglColorRenderbuffer[NJ]);let bJ=Z.get(R[NJ]).__webglTexture;J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,bJ,0)}if(J.blitFramebuffer(0,0,h,s,0,0,h,s,a,J.NEAREST),U===!0){if(S.length=0,GJ.length=0,S.push(J.COLOR_ATTACHMENT0+NJ),C.depthBuffer&&C.resolveDepthBuffer===!1)S.push(c),GJ.push(c),J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,GJ);J.invalidateFramebuffer(J.READ_FRAMEBUFFER,S)}}if(Q.bindFramebuffer(J.READ_FRAMEBUFFER,null),Q.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),KJ)for(let NJ=0;NJ<R.length;NJ++){Q.bindFramebuffer(J.FRAMEBUFFER,FJ.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+NJ,J.RENDERBUFFER,FJ.__webglColorRenderbuffer[NJ]);let bJ=Z.get(R[NJ]).__webglTexture;Q.bindFramebuffer(J.FRAMEBUFFER,FJ.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+NJ,J.TEXTURE_2D,bJ,0)}Q.bindFramebuffer(J.DRAW_FRAMEBUFFER,FJ.__webglMultisampledFramebuffer)}else if(C.depthBuffer&&C.resolveDepthBuffer===!1&&U){let R=C.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,[R])}}}function AJ(C){return Math.min(W.maxSamples,C.samples)}function YJ(C){let R=Z.get(C);return C.samples>0&&$.has("WEBGL_multisampled_render_to_texture")===!0&&R.__useRenderToTexture!==!1}function sJ(C){let R=K.render.frame;if(G.get(C)!==R)G.set(C,R),C.update()}function DJ(C,R){let{colorSpace:h,format:s,type:a}=C;if(C.isCompressedTexture===!0||C.isVideoTexture===!0)return R;if(h!=="srgb-linear"&&h!=="")if(oJ.getTransfer(h)==="srgb"){if(s!==1023||a!==1009)console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.")}else console.error("THREE.WebGLTextures: Unsupported texture color space:",h);return R}function wJ(C){if(typeof HTMLImageElement<"u"&&C instanceof HTMLImageElement)H.width=C.naturalWidth||C.width,H.height=C.naturalHeight||C.height;else if(typeof VideoFrame<"u"&&C instanceof VideoFrame)H.width=C.displayWidth,H.height=C.displayHeight;else H.width=C.width,H.height=C.height;return H}this.allocateTextureUnit=m,this.resetTextureUnits=l,this.setTexture2D=t,this.setTexture2DArray=g,this.setTexture3D=e,this.setTextureCube=u,this.rebindTextures=OJ,this.setupRenderTarget=LJ,this.updateRenderTargetMipmap=zJ,this.updateMultisampleRenderTarget=yJ,this.setupDepthRenderbuffer=jJ,this.setupFrameBufferTexture=SJ,this.useMultisampledRTT=YJ}function d4(J,$){function Q(Z,W=""){let Y,K=oJ.getTransfer(W);if(Z===1009)return J.UNSIGNED_BYTE;if(Z===1017)return J.UNSIGNED_SHORT_4_4_4_4;if(Z===1018)return J.UNSIGNED_SHORT_5_5_5_1;if(Z===35902)return J.UNSIGNED_INT_5_9_9_9_REV;if(Z===1010)return J.BYTE;if(Z===1011)return J.SHORT;if(Z===1012)return J.UNSIGNED_SHORT;if(Z===1013)return J.INT;if(Z===1014)return J.UNSIGNED_INT;if(Z===1015)return J.FLOAT;if(Z===1016)return J.HALF_FLOAT;if(Z===1021)return J.ALPHA;if(Z===1022)return J.RGB;if(Z===1023)return J.RGBA;if(Z===1024)return J.LUMINANCE;if(Z===1025)return J.LUMINANCE_ALPHA;if(Z===1026)return J.DEPTH_COMPONENT;if(Z===1027)return J.DEPTH_STENCIL;if(Z===1028)return J.RED;if(Z===1029)return J.RED_INTEGER;if(Z===1030)return J.RG;if(Z===1031)return J.RG_INTEGER;if(Z===1033)return J.RGBA_INTEGER;if(Z===33776||Z===33777||Z===33778||Z===33779)if(K==="srgb")if(Y=$.get("WEBGL_compressed_texture_s3tc_srgb"),Y!==null){if(Z===33776)return Y.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(Z===33777)return Y.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(Z===33778)return Y.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(Z===33779)return Y.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(Y=$.get("WEBGL_compressed_texture_s3tc"),Y!==null){if(Z===33776)return Y.COMPRESSED_RGB_S3TC_DXT1_EXT;if(Z===33777)return Y.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(Z===33778)return Y.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(Z===33779)return Y.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(Z===35840||Z===35841||Z===35842||Z===35843)if(Y=$.get("WEBGL_compressed_texture_pvrtc"),Y!==null){if(Z===35840)return Y.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(Z===35841)return Y.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(Z===35842)return Y.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(Z===35843)return Y.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(Z===36196||Z===37492||Z===37496)if(Y=$.get("WEBGL_compressed_texture_etc"),Y!==null){if(Z===36196||Z===37492)return K==="srgb"?Y.COMPRESSED_SRGB8_ETC2:Y.COMPRESSED_RGB8_ETC2;if(Z===37496)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:Y.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(Z===37808||Z===37809||Z===37810||Z===37811||Z===37812||Z===37813||Z===37814||Z===37815||Z===37816||Z===37817||Z===37818||Z===37819||Z===37820||Z===37821)if(Y=$.get("WEBGL_compressed_texture_astc"),Y!==null){if(Z===37808)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:Y.COMPRESSED_RGBA_ASTC_4x4_KHR;if(Z===37809)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:Y.COMPRESSED_RGBA_ASTC_5x4_KHR;if(Z===37810)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:Y.COMPRESSED_RGBA_ASTC_5x5_KHR;if(Z===37811)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:Y.COMPRESSED_RGBA_ASTC_6x5_KHR;if(Z===37812)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:Y.COMPRESSED_RGBA_ASTC_6x6_KHR;if(Z===37813)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:Y.COMPRESSED_RGBA_ASTC_8x5_KHR;if(Z===37814)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:Y.COMPRESSED_RGBA_ASTC_8x6_KHR;if(Z===37815)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:Y.COMPRESSED_RGBA_ASTC_8x8_KHR;if(Z===37816)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:Y.COMPRESSED_RGBA_ASTC_10x5_KHR;if(Z===37817)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:Y.COMPRESSED_RGBA_ASTC_10x6_KHR;if(Z===37818)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:Y.COMPRESSED_RGBA_ASTC_10x8_KHR;if(Z===37819)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:Y.COMPRESSED_RGBA_ASTC_10x10_KHR;if(Z===37820)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:Y.COMPRESSED_RGBA_ASTC_12x10_KHR;if(Z===37821)return K==="srgb"?Y.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:Y.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(Z===36492||Z===36494||Z===36495)if(Y=$.get("EXT_texture_compression_bptc"),Y!==null){if(Z===36492)return K==="srgb"?Y.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:Y.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(Z===36494)return Y.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(Z===36495)return Y.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(Z===36283||Z===36284||Z===36285||Z===36286)if(Y=$.get("EXT_texture_compression_rgtc"),Y!==null){if(Z===36492)return Y.COMPRESSED_RED_RGTC1_EXT;if(Z===36284)return Y.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(Z===36285)return Y.COMPRESSED_RED_GREEN_RGTC2_EXT;if(Z===36286)return Y.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;if(Z===1020)return J.UNSIGNED_INT_24_8;return J[Z]!==void 0?J[Z]:null}return{convert:Q}}class O$ extends j0{constructor(J=[]){super();this.isArrayCamera=!0,this.cameras=J}}class Z0 extends q0{constructor(){super();this.isGroup=!0,this.type="Group"}}var c4={type:"move"};class K8{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){if(this._hand===null)this._hand=new Z0,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1};return this._hand}getTargetRaySpace(){if(this._targetRay===null)this._targetRay=new Z0,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new A,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new A;return this._targetRay}getGripSpace(){if(this._grip===null)this._grip=new Z0,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new A,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new A;return this._grip}dispatchEvent(J){if(this._targetRay!==null)this._targetRay.dispatchEvent(J);if(this._grip!==null)this._grip.dispatchEvent(J);if(this._hand!==null)this._hand.dispatchEvent(J);return this}connect(J){if(J&&J.hand){let $=this._hand;if($)for(let Q of J.hand.values())this._getHandJoint($,Q)}return this.dispatchEvent({type:"connected",data:J}),this}disconnect(J){if(this.dispatchEvent({type:"disconnected",data:J}),this._targetRay!==null)this._targetRay.visible=!1;if(this._grip!==null)this._grip.visible=!1;if(this._hand!==null)this._hand.visible=!1;return this}update(J,$,Q){let Z=null,W=null,Y=null,K=this._targetRay,X=this._grip,U=this._hand;if(J&&$.session.visibilityState!=="visible-blurred"){if(U&&J.hand){Y=!0;for(let O of J.hand.values()){let M=$.getJointPose(O,Q),F=this._getHandJoint(U,O);if(M!==null)F.matrix.fromArray(M.transform.matrix),F.matrix.decompose(F.position,F.rotation,F.scale),F.matrixWorldNeedsUpdate=!0,F.jointRadius=M.radius;F.visible=M!==null}let H=U.joints["index-finger-tip"],G=U.joints["thumb-tip"],V=H.position.distanceTo(G.position),q=0.02,D=0.005;if(U.inputState.pinching&&V>q+D)U.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:J.handedness,target:this});else if(!U.inputState.pinching&&V<=q-D)U.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:J.handedness,target:this})}else if(X!==null&&J.gripSpace){if(W=$.getPose(J.gripSpace,Q),W!==null){if(X.matrix.fromArray(W.transform.matrix),X.matrix.decompose(X.position,X.rotation,X.scale),X.matrixWorldNeedsUpdate=!0,W.linearVelocity)X.hasLinearVelocity=!0,X.linearVelocity.copy(W.linearVelocity);else X.hasLinearVelocity=!1;if(W.angularVelocity)X.hasAngularVelocity=!0,X.angularVelocity.copy(W.angularVelocity);else X.hasAngularVelocity=!1}}if(K!==null){if(Z=$.getPose(J.targetRaySpace,Q),Z===null&&W!==null)Z=W;if(Z!==null){if(K.matrix.fromArray(Z.transform.matrix),K.matrix.decompose(K.position,K.rotation,K.scale),K.matrixWorldNeedsUpdate=!0,Z.linearVelocity)K.hasLinearVelocity=!0,K.linearVelocity.copy(Z.linearVelocity);else K.hasLinearVelocity=!1;if(Z.angularVelocity)K.hasAngularVelocity=!0,K.angularVelocity.copy(Z.angularVelocity);else K.hasAngularVelocity=!1;this.dispatchEvent(c4)}}}if(K!==null)K.visible=Z!==null;if(X!==null)X.visible=W!==null;if(U!==null)U.visible=Y!==null;return this}_getHandJoint(J,$){if(J.joints[$.jointName]===void 0){let Q=new Z0;Q.matrixAutoUpdate=!1,Q.visible=!1,J.joints[$.jointName]=Q,J.add(Q)}return J.joints[$.jointName]}}var n4=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,s4=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class M${constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(J,$,Q){if(this.texture===null){let Z=new L0,W=J.properties.get(Z);if(W.__webglTexture=$.texture,$.depthNear!=Q.depthNear||$.depthFar!=Q.depthFar)this.depthNear=$.depthNear,this.depthFar=$.depthFar;this.texture=Z}}getMesh(J){if(this.texture!==null){if(this.mesh===null){let $=J.cameras[0].viewport,Q=new Z6({vertexShader:n4,fragmentShader:s4,uniforms:{depthColor:{value:this.texture},depthWidth:{value:$.z},depthHeight:{value:$.w}}});this.mesh=new TJ(new Y6(20,20),Q)}}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class B$ extends T6{constructor(J,$){super();let Q=this,Z=null,W=1,Y=null,K="local-floor",X=1,U=null,H=null,G=null,V=null,q=null,D=null,O=new M$,M=$.getContextAttributes(),F=null,E=null,z=[],N=[],k=new BJ,f=null,w=new j0;w.viewport=new H0;let I=new j0;I.viewport=new H0;let x=[w,I],L=new O$,_=null,P=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(o){let JJ=z[o];if(JJ===void 0)JJ=new K8,z[o]=JJ;return JJ.getTargetRaySpace()},this.getControllerGrip=function(o){let JJ=z[o];if(JJ===void 0)JJ=new K8,z[o]=JJ;return JJ.getGripSpace()},this.getHand=function(o){let JJ=z[o];if(JJ===void 0)JJ=new K8,z[o]=JJ;return JJ.getHandSpace()};function l(o){let JJ=N.indexOf(o.inputSource);if(JJ===-1)return;let PJ=z[JJ];if(PJ!==void 0)PJ.update(o.inputSource,o.frame,U||Y),PJ.dispatchEvent({type:o.type,data:o.inputSource})}function m(){Z.removeEventListener("select",l),Z.removeEventListener("selectstart",l),Z.removeEventListener("selectend",l),Z.removeEventListener("squeeze",l),Z.removeEventListener("squeezestart",l),Z.removeEventListener("squeezeend",l),Z.removeEventListener("end",m),Z.removeEventListener("inputsourceschange",d);for(let o=0;o<z.length;o++){let JJ=N[o];if(JJ===null)continue;N[o]=null,z[o].disconnect(JJ)}_=null,P=null,O.reset(),J.setRenderTarget(F),q=null,V=null,G=null,Z=null,E=null,fJ.stop(),Q.isPresenting=!1,J.setPixelRatio(f),J.setSize(k.width,k.height,!1),Q.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(o){if(W=o,Q.isPresenting===!0)console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(o){if(K=o,Q.isPresenting===!0)console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return U||Y},this.setReferenceSpace=function(o){U=o},this.getBaseLayer=function(){return V!==null?V:q},this.getBinding=function(){return G},this.getFrame=function(){return D},this.getSession=function(){return Z},this.setSession=async function(o){if(Z=o,Z!==null){if(F=J.getRenderTarget(),Z.addEventListener("select",l),Z.addEventListener("selectstart",l),Z.addEventListener("selectend",l),Z.addEventListener("squeeze",l),Z.addEventListener("squeezestart",l),Z.addEventListener("squeezeend",l),Z.addEventListener("end",m),Z.addEventListener("inputsourceschange",d),M.xrCompatible!==!0)await $.makeXRCompatible();if(f=J.getPixelRatio(),J.getSize(k),Z.renderState.layers===void 0){let JJ={antialias:M.antialias,alpha:!0,depth:M.depth,stencil:M.stencil,framebufferScaleFactor:W};q=new XRWebGLLayer(Z,$,JJ),Z.updateRenderState({baseLayer:q}),J.setPixelRatio(1),J.setSize(q.framebufferWidth,q.framebufferHeight,!1),E=new M6(q.framebufferWidth,q.framebufferHeight,{format:1023,type:1009,colorSpace:J.outputColorSpace,stencilBuffer:M.stencil})}else{let JJ=null,PJ=null,SJ=null;if(M.depth)SJ=M.stencil?$.DEPTH24_STENCIL8:$.DEPTH_COMPONENT24,JJ=M.stencil?1027:1026,PJ=M.stencil?1020:1014;let UJ={colorFormat:$.RGBA8,depthFormat:SJ,scaleFactor:W};G=new XRWebGLBinding(Z,$),V=G.createProjectionLayer(UJ),Z.updateRenderState({layers:[V]}),J.setPixelRatio(1),J.setSize(V.textureWidth,V.textureHeight,!1),E=new M6(V.textureWidth,V.textureHeight,{format:1023,type:1009,depthTexture:new R9(V.textureWidth,V.textureHeight,PJ,void 0,void 0,void 0,void 0,void 0,void 0,JJ),stencilBuffer:M.stencil,colorSpace:J.outputColorSpace,samples:M.antialias?4:0,resolveDepthBuffer:V.ignoreDepthValues===!1})}E.isXRRenderTarget=!0,this.setFoveation(X),U=null,Y=await Z.requestReferenceSpace(K),fJ.setContext(Z),fJ.start(),Q.isPresenting=!0,Q.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(Z!==null)return Z.environmentBlendMode},this.getDepthTexture=function(){return O.getDepthTexture()};function d(o){for(let JJ=0;JJ<o.removed.length;JJ++){let PJ=o.removed[JJ],SJ=N.indexOf(PJ);if(SJ>=0)N[SJ]=null,z[SJ].disconnect(PJ)}for(let JJ=0;JJ<o.added.length;JJ++){let PJ=o.added[JJ],SJ=N.indexOf(PJ);if(SJ===-1){for(let T=0;T<z.length;T++)if(T>=N.length){N.push(PJ),SJ=T;break}else if(N[T]===null){N[T]=PJ,SJ=T;break}if(SJ===-1)break}let UJ=z[SJ];if(UJ)UJ.connect(PJ)}}let t=new A,g=new A;function e(o,JJ,PJ){t.setFromMatrixPosition(JJ.matrixWorld),g.setFromMatrixPosition(PJ.matrixWorld);let SJ=t.distanceTo(g),UJ=JJ.projectionMatrix.elements,T=PJ.projectionMatrix.elements,jJ=UJ[14]/(UJ[10]-1),OJ=UJ[14]/(UJ[10]+1),LJ=(UJ[9]+1)/UJ[5],zJ=(UJ[9]-1)/UJ[5],S=(UJ[8]-1)/UJ[0],GJ=(T[8]+1)/T[0],yJ=jJ*S,AJ=jJ*GJ,YJ=SJ/(-S+GJ),sJ=YJ*-S;if(JJ.matrixWorld.decompose(o.position,o.quaternion,o.scale),o.translateX(sJ),o.translateZ(YJ),o.matrixWorld.compose(o.position,o.quaternion,o.scale),o.matrixWorldInverse.copy(o.matrixWorld).invert(),UJ[10]===-1)o.projectionMatrix.copy(JJ.projectionMatrix),o.projectionMatrixInverse.copy(JJ.projectionMatrixInverse);else{let DJ=jJ+YJ,wJ=OJ+YJ,C=yJ-sJ,R=AJ+(SJ-sJ),h=LJ*OJ/wJ*DJ,s=zJ*OJ/wJ*DJ;o.projectionMatrix.makePerspective(C,R,h,s,DJ,wJ),o.projectionMatrixInverse.copy(o.projectionMatrix).invert()}}function u(o,JJ){if(JJ===null)o.matrixWorld.copy(o.matrix);else o.matrixWorld.multiplyMatrices(JJ.matrixWorld,o.matrix);o.matrixWorldInverse.copy(o.matrixWorld).invert()}this.updateCamera=function(o){if(Z===null)return;let{near:JJ,far:PJ}=o;if(O.texture!==null){if(O.depthNear>0)JJ=O.depthNear;if(O.depthFar>0)PJ=O.depthFar}if(L.near=I.near=w.near=JJ,L.far=I.far=w.far=PJ,_!==L.near||P!==L.far)Z.updateRenderState({depthNear:L.near,depthFar:L.far}),_=L.near,P=L.far;w.layers.mask=o.layers.mask|2,I.layers.mask=o.layers.mask|4,L.layers.mask=w.layers.mask|I.layers.mask;let SJ=o.parent,UJ=L.cameras;u(L,SJ);for(let T=0;T<UJ.length;T++)u(UJ[T],SJ);if(UJ.length===2)e(L,w,I);else L.projectionMatrix.copy(w.projectionMatrix);WJ(o,L,SJ)};function WJ(o,JJ,PJ){if(PJ===null)o.matrix.copy(JJ.matrixWorld);else o.matrix.copy(PJ.matrixWorld),o.matrix.invert(),o.matrix.multiply(JJ.matrixWorld);if(o.matrix.decompose(o.position,o.quaternion,o.scale),o.updateMatrixWorld(!0),o.projectionMatrix.copy(JJ.projectionMatrix),o.projectionMatrixInverse.copy(JJ.projectionMatrixInverse),o.isPerspectiveCamera)o.fov=W9*2*Math.atan(1/o.projectionMatrix.elements[5]),o.zoom=1}this.getCamera=function(){return L},this.getFoveation=function(){if(V===null&&q===null)return;return X},this.setFoveation=function(o){if(X=o,V!==null)V.fixedFoveation=o;if(q!==null&&q.fixedFoveation!==void 0)q.fixedFoveation=o},this.hasDepthSensing=function(){return O.texture!==null},this.getDepthSensingMesh=function(){return O.getMesh(L)};let HJ=null;function vJ(o,JJ){if(H=JJ.getViewerPose(U||Y),D=JJ,H!==null){let PJ=H.views;if(q!==null)J.setRenderTargetFramebuffer(E,q.framebuffer),J.setRenderTarget(E);let SJ=!1;if(PJ.length!==L.cameras.length)L.cameras.length=0,SJ=!0;for(let T=0;T<PJ.length;T++){let jJ=PJ[T],OJ=null;if(q!==null)OJ=q.getViewport(jJ);else{let zJ=G.getViewSubImage(V,jJ);if(OJ=zJ.viewport,T===0)J.setRenderTargetTextures(E,zJ.colorTexture,V.ignoreDepthValues?void 0:zJ.depthStencilTexture),J.setRenderTarget(E)}let LJ=x[T];if(LJ===void 0)LJ=new j0,LJ.layers.enable(T),LJ.viewport=new H0,x[T]=LJ;if(LJ.matrix.fromArray(jJ.transform.matrix),LJ.matrix.decompose(LJ.position,LJ.quaternion,LJ.scale),LJ.projectionMatrix.fromArray(jJ.projectionMatrix),LJ.projectionMatrixInverse.copy(LJ.projectionMatrix).invert(),LJ.viewport.set(OJ.x,OJ.y,OJ.width,OJ.height),T===0)L.matrix.copy(LJ.matrix),L.matrix.decompose(L.position,L.quaternion,L.scale);if(SJ===!0)L.cameras.push(LJ)}let UJ=Z.enabledFeatures;if(UJ&&UJ.includes("depth-sensing")){let T=G.getDepthInformation(PJ[0]);if(T&&T.isValid&&T.texture)O.init(J,T,Z.renderState)}}for(let PJ=0;PJ<z.length;PJ++){let SJ=N[PJ],UJ=z[PJ];if(SJ!==null&&UJ!==void 0)UJ.update(SJ,JJ,U||Y)}if(HJ)HJ(o,JJ);if(JJ.detectedPlanes)Q.dispatchEvent({type:"planesdetected",data:JJ});D=null}let fJ=new K$;fJ.setAnimationLoop(vJ),this.setAnimationLoop=function(o){HJ=o},this.dispose=function(){}}}var A6=new c0,o4=new Q0;function i4(J,$){function Q(F,E){if(F.matrixAutoUpdate===!0)F.updateMatrix();E.value.copy(F.matrix)}function Z(F,E){if(E.color.getRGB(F.fogColor.value,Z$(J)),E.isFog)F.fogNear.value=E.near,F.fogFar.value=E.far;else if(E.isFogExp2)F.fogDensity.value=E.density}function W(F,E,z,N,k){if(E.isMeshBasicMaterial)Y(F,E);else if(E.isMeshLambertMaterial)Y(F,E);else if(E.isMeshToonMaterial)Y(F,E),V(F,E);else if(E.isMeshPhongMaterial)Y(F,E),G(F,E);else if(E.isMeshStandardMaterial){if(Y(F,E),q(F,E),E.isMeshPhysicalMaterial)D(F,E,k)}else if(E.isMeshMatcapMaterial)Y(F,E),O(F,E);else if(E.isMeshDepthMaterial)Y(F,E);else if(E.isMeshDistanceMaterial)Y(F,E),M(F,E);else if(E.isMeshNormalMaterial)Y(F,E);else if(E.isLineBasicMaterial){if(K(F,E),E.isLineDashedMaterial)X(F,E)}else if(E.isPointsMaterial)U(F,E,z,N);else if(E.isSpriteMaterial)H(F,E);else if(E.isShadowMaterial)F.color.value.copy(E.color),F.opacity.value=E.opacity;else if(E.isShaderMaterial)E.uniformsNeedUpdate=!1}function Y(F,E){if(F.opacity.value=E.opacity,E.color)F.diffuse.value.copy(E.color);if(E.emissive)F.emissive.value.copy(E.emissive).multiplyScalar(E.emissiveIntensity);if(E.map)F.map.value=E.map,Q(E.map,F.mapTransform);if(E.alphaMap)F.alphaMap.value=E.alphaMap,Q(E.alphaMap,F.alphaMapTransform);if(E.bumpMap){if(F.bumpMap.value=E.bumpMap,Q(E.bumpMap,F.bumpMapTransform),F.bumpScale.value=E.bumpScale,E.side===1)F.bumpScale.value*=-1}if(E.normalMap){if(F.normalMap.value=E.normalMap,Q(E.normalMap,F.normalMapTransform),F.normalScale.value.copy(E.normalScale),E.side===1)F.normalScale.value.negate()}if(E.displacementMap)F.displacementMap.value=E.displacementMap,Q(E.displacementMap,F.displacementMapTransform),F.displacementScale.value=E.displacementScale,F.displacementBias.value=E.displacementBias;if(E.emissiveMap)F.emissiveMap.value=E.emissiveMap,Q(E.emissiveMap,F.emissiveMapTransform);if(E.specularMap)F.specularMap.value=E.specularMap,Q(E.specularMap,F.specularMapTransform);if(E.alphaTest>0)F.alphaTest.value=E.alphaTest;let z=$.get(E),N=z.envMap,k=z.envMapRotation;if(N){if(F.envMap.value=N,A6.copy(k),A6.x*=-1,A6.y*=-1,A6.z*=-1,N.isCubeTexture&&N.isRenderTargetTexture===!1)A6.y*=-1,A6.z*=-1;F.envMapRotation.value.setFromMatrix4(o4.makeRotationFromEuler(A6)),F.flipEnvMap.value=N.isCubeTexture&&N.isRenderTargetTexture===!1?-1:1,F.reflectivity.value=E.reflectivity,F.ior.value=E.ior,F.refractionRatio.value=E.refractionRatio}if(E.lightMap)F.lightMap.value=E.lightMap,F.lightMapIntensity.value=E.lightMapIntensity,Q(E.lightMap,F.lightMapTransform);if(E.aoMap)F.aoMap.value=E.aoMap,F.aoMapIntensity.value=E.aoMapIntensity,Q(E.aoMap,F.aoMapTransform)}function K(F,E){if(F.diffuse.value.copy(E.color),F.opacity.value=E.opacity,E.map)F.map.value=E.map,Q(E.map,F.mapTransform)}function X(F,E){F.dashSize.value=E.dashSize,F.totalSize.value=E.dashSize+E.gapSize,F.scale.value=E.scale}function U(F,E,z,N){if(F.diffuse.value.copy(E.color),F.opacity.value=E.opacity,F.size.value=E.size*z,F.scale.value=N*0.5,E.map)F.map.value=E.map,Q(E.map,F.uvTransform);if(E.alphaMap)F.alphaMap.value=E.alphaMap,Q(E.alphaMap,F.alphaMapTransform);if(E.alphaTest>0)F.alphaTest.value=E.alphaTest}function H(F,E){if(F.diffuse.value.copy(E.color),F.opacity.value=E.opacity,F.rotation.value=E.rotation,E.map)F.map.value=E.map,Q(E.map,F.mapTransform);if(E.alphaMap)F.alphaMap.value=E.alphaMap,Q(E.alphaMap,F.alphaMapTransform);if(E.alphaTest>0)F.alphaTest.value=E.alphaTest}function G(F,E){F.specular.value.copy(E.specular),F.shininess.value=Math.max(E.shininess,0.0001)}function V(F,E){if(E.gradientMap)F.gradientMap.value=E.gradientMap}function q(F,E){if(F.metalness.value=E.metalness,E.metalnessMap)F.metalnessMap.value=E.metalnessMap,Q(E.metalnessMap,F.metalnessMapTransform);if(F.roughness.value=E.roughness,E.roughnessMap)F.roughnessMap.value=E.roughnessMap,Q(E.roughnessMap,F.roughnessMapTransform);if(E.envMap)F.envMapIntensity.value=E.envMapIntensity}function D(F,E,z){if(F.ior.value=E.ior,E.sheen>0){if(F.sheenColor.value.copy(E.sheenColor).multiplyScalar(E.sheen),F.sheenRoughness.value=E.sheenRoughness,E.sheenColorMap)F.sheenColorMap.value=E.sheenColorMap,Q(E.sheenColorMap,F.sheenColorMapTransform);if(E.sheenRoughnessMap)F.sheenRoughnessMap.value=E.sheenRoughnessMap,Q(E.sheenRoughnessMap,F.sheenRoughnessMapTransform)}if(E.clearcoat>0){if(F.clearcoat.value=E.clearcoat,F.clearcoatRoughness.value=E.clearcoatRoughness,E.clearcoatMap)F.clearcoatMap.value=E.clearcoatMap,Q(E.clearcoatMap,F.clearcoatMapTransform);if(E.clearcoatRoughnessMap)F.clearcoatRoughnessMap.value=E.clearcoatRoughnessMap,Q(E.clearcoatRoughnessMap,F.clearcoatRoughnessMapTransform);if(E.clearcoatNormalMap){if(F.clearcoatNormalMap.value=E.clearcoatNormalMap,Q(E.clearcoatNormalMap,F.clearcoatNormalMapTransform),F.clearcoatNormalScale.value.copy(E.clearcoatNormalScale),E.side===1)F.clearcoatNormalScale.value.negate()}}if(E.dispersion>0)F.dispersion.value=E.dispersion;if(E.iridescence>0){if(F.iridescence.value=E.iridescence,F.iridescenceIOR.value=E.iridescenceIOR,F.iridescenceThicknessMinimum.value=E.iridescenceThicknessRange[0],F.iridescenceThicknessMaximum.value=E.iridescenceThicknessRange[1],E.iridescenceMap)F.iridescenceMap.value=E.iridescenceMap,Q(E.iridescenceMap,F.iridescenceMapTransform);if(E.iridescenceThicknessMap)F.iridescenceThicknessMap.value=E.iridescenceThicknessMap,Q(E.iridescenceThicknessMap,F.iridescenceThicknessMapTransform)}if(E.transmission>0){if(F.transmission.value=E.transmission,F.transmissionSamplerMap.value=z.texture,F.transmissionSamplerSize.value.set(z.width,z.height),E.transmissionMap)F.transmissionMap.value=E.transmissionMap,Q(E.transmissionMap,F.transmissionMapTransform);if(F.thickness.value=E.thickness,E.thicknessMap)F.thicknessMap.value=E.thicknessMap,Q(E.thicknessMap,F.thicknessMapTransform);F.attenuationDistance.value=E.attenuationDistance,F.attenuationColor.value.copy(E.attenuationColor)}if(E.anisotropy>0){if(F.anisotropyVector.value.set(E.anisotropy*Math.cos(E.anisotropyRotation),E.anisotropy*Math.sin(E.anisotropyRotation)),E.anisotropyMap)F.anisotropyMap.value=E.anisotropyMap,Q(E.anisotropyMap,F.anisotropyMapTransform)}if(F.specularIntensity.value=E.specularIntensity,F.specularColor.value.copy(E.specularColor),E.specularColorMap)F.specularColorMap.value=E.specularColorMap,Q(E.specularColorMap,F.specularColorMapTransform);if(E.specularIntensityMap)F.specularIntensityMap.value=E.specularIntensityMap,Q(E.specularIntensityMap,F.specularIntensityMapTransform)}function O(F,E){if(E.matcap)F.matcap.value=E.matcap}function M(F,E){let z=$.get(E).light;F.referencePosition.value.setFromMatrixPosition(z.matrixWorld),F.nearDistance.value=z.shadow.camera.near,F.farDistance.value=z.shadow.camera.far}return{refreshFogUniforms:Z,refreshMaterialUniforms:W}}function a4(J,$,Q,Z){let W={},Y={},K=[],X=J.getParameter(J.MAX_UNIFORM_BUFFER_BINDINGS);function U(z,N){let k=N.program;Z.uniformBlockBinding(z,k)}function H(z,N){let k=W[z.id];if(k===void 0)O(z),k=G(z),W[z.id]=k,z.addEventListener("dispose",F);let f=N.program;Z.updateUBOMapping(z,f);let w=$.render.frame;if(Y[z.id]!==w)q(z),Y[z.id]=w}function G(z){let N=V();z.__bindingPointIndex=N;let k=J.createBuffer(),f=z.__size,w=z.usage;return J.bindBuffer(J.UNIFORM_BUFFER,k),J.bufferData(J.UNIFORM_BUFFER,f,w),J.bindBuffer(J.UNIFORM_BUFFER,null),J.bindBufferBase(J.UNIFORM_BUFFER,N,k),k}function V(){for(let z=0;z<X;z++)if(K.indexOf(z)===-1)return K.push(z),z;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function q(z){let N=W[z.id],k=z.uniforms,f=z.__cache;J.bindBuffer(J.UNIFORM_BUFFER,N);for(let w=0,I=k.length;w<I;w++){let x=Array.isArray(k[w])?k[w]:[k[w]];for(let L=0,_=x.length;L<_;L++){let P=x[L];if(D(P,w,L,f)===!0){let l=P.__offset,m=Array.isArray(P.value)?P.value:[P.value],d=0;for(let t=0;t<m.length;t++){let g=m[t],e=M(g);if(typeof g==="number"||typeof g==="boolean")P.__data[0]=g,J.bufferSubData(J.UNIFORM_BUFFER,l+d,P.__data);else if(g.isMatrix3)P.__data[0]=g.elements[0],P.__data[1]=g.elements[1],P.__data[2]=g.elements[2],P.__data[3]=0,P.__data[4]=g.elements[3],P.__data[5]=g.elements[4],P.__data[6]=g.elements[5],P.__data[7]=0,P.__data[8]=g.elements[6],P.__data[9]=g.elements[7],P.__data[10]=g.elements[8],P.__data[11]=0;else g.toArray(P.__data,d),d+=e.storage/Float32Array.BYTES_PER_ELEMENT}J.bufferSubData(J.UNIFORM_BUFFER,l,P.__data)}}}J.bindBuffer(J.UNIFORM_BUFFER,null)}function D(z,N,k,f){let w=z.value,I=N+"_"+k;if(f[I]===void 0){if(typeof w==="number"||typeof w==="boolean")f[I]=w;else f[I]=w.clone();return!0}else{let x=f[I];if(typeof w==="number"||typeof w==="boolean"){if(x!==w)return f[I]=w,!0}else if(x.equals(w)===!1)return x.copy(w),!0}return!1}function O(z){let N=z.uniforms,k=0,f=16;for(let I=0,x=N.length;I<x;I++){let L=Array.isArray(N[I])?N[I]:[N[I]];for(let _=0,P=L.length;_<P;_++){let l=L[_],m=Array.isArray(l.value)?l.value:[l.value];for(let d=0,t=m.length;d<t;d++){let g=m[d],e=M(g),u=k%f,WJ=u%e.boundary,HJ=u+WJ;if(k+=WJ,HJ!==0&&f-HJ<e.storage)k+=f-HJ;l.__data=new Float32Array(e.storage/Float32Array.BYTES_PER_ELEMENT),l.__offset=k,k+=e.storage}}}let w=k%f;if(w>0)k+=f-w;return z.__size=k,z.__cache={},this}function M(z){let N={boundary:0,storage:0};if(typeof z==="number"||typeof z==="boolean")N.boundary=4,N.storage=4;else if(z.isVector2)N.boundary=8,N.storage=8;else if(z.isVector3||z.isColor)N.boundary=16,N.storage=12;else if(z.isVector4)N.boundary=16,N.storage=16;else if(z.isMatrix3)N.boundary=48,N.storage=48;else if(z.isMatrix4)N.boundary=64,N.storage=64;else if(z.isTexture)console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group.");else console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",z);return N}function F(z){let N=z.target;N.removeEventListener("dispose",F);let k=K.indexOf(N.__bindingPointIndex);K.splice(k,1),J.deleteBuffer(W[N.id]),delete W[N.id],delete Y[N.id]}function E(){for(let z in W)J.deleteBuffer(W[z]);K=[],W={},Y={}}return{bind:U,update:H,dispose:E}}class N9{constructor(J={}){let{canvas:$=JQ(),context:Q=null,depth:Z=!0,stencil:W=!1,alpha:Y=!1,antialias:K=!1,premultipliedAlpha:X=!0,preserveDrawingBuffer:U=!1,powerPreference:H="default",failIfMajorPerformanceCaveat:G=!1,reverseDepthBuffer:V=!1}=J;this.isWebGLRenderer=!0;let q;if(Q!==null){if(typeof WebGLRenderingContext<"u"&&Q instanceof WebGLRenderingContext)throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");q=Q.getContextAttributes().alpha}else q=Y;let D=new Uint32Array(4),O=new Int32Array(4),M=null,F=null,E=[],z=[];this.domElement=$,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace="srgb",this.toneMapping=0,this.toneMappingExposure=1;let N=this,k=!1,f=0,w=0,I=null,x=-1,L=null,_=new H0,P=new H0,l=null,m=new cJ(0),d=0,t=$.width,g=$.height,e=1,u=null,WJ=null,HJ=new H0(0,0,t,g),vJ=new H0(0,0,t,g),fJ=!1,o=new q8,JJ=!1,PJ=!1,SJ=new Q0,UJ=new Q0,T=new A,jJ=new H0,OJ={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},LJ=!1;function zJ(){return I===null?e:1}let S=Q;function GJ(B,y){return $.getContext(B,y)}try{let B={alpha:!0,depth:Z,stencil:W,antialias:K,premultipliedAlpha:X,preserveDrawingBuffer:U,powerPreference:H,failIfMajorPerformanceCaveat:G};if("setAttribute"in $)$.setAttribute("data-engine","three.js r170");if($.addEventListener("webglcontextlost",i,!1),$.addEventListener("webglcontextrestored",r,!1),$.addEventListener("webglcontextcreationerror",EJ,!1),S===null){if(S=GJ("webgl2",B),S===null)if(GJ("webgl2"))throw Error("Error creating WebGL context with your selected attributes.");else throw Error("Error creating WebGL context.")}}catch(B){throw console.error("THREE.WebGLRenderer: "+B.message),B}let yJ,AJ,YJ,sJ,DJ,wJ,C,R,h,s,a,c,FJ,KJ,NJ,bJ,QJ,RJ,nJ,hJ,MJ,gJ,dJ,X0;function v(){if(yJ=new VY(S),yJ.init(),gJ=new d4(S,yJ),AJ=new KY(S,yJ,J,gJ),YJ=new l4(S,yJ),AJ.reverseDepthBuffer&&V)YJ.buffers.depth.setReversed(!0);sJ=new DY(S),DJ=new I4,wJ=new u4(S,yJ,YJ,DJ,AJ,gJ,sJ),C=new UY(N),R=new qY(N),h=new zQ(S),dJ=new WY(S,h),s=new EY(S,h,sJ,dJ),a=new NY(S,s,h,sJ),nJ=new RY(S,AJ,wJ),bJ=new XY(DJ),c=new w4(N,C,R,yJ,AJ,dJ,bJ),FJ=new i4(N,DJ),KJ=new P4,NJ=new h4(yJ),RJ=new ZY(N,C,R,YJ,a,q,X),QJ=new g4(N,a,AJ),X0=new a4(S,sJ,AJ,YJ),hJ=new YY(S,yJ,sJ),MJ=new FY(S,yJ,sJ),sJ.programs=c.programs,N.capabilities=AJ,N.extensions=yJ,N.properties=DJ,N.renderLists=KJ,N.shadowMap=QJ,N.state=YJ,N.info=sJ}v();let $J=new B$(N,S);this.xr=$J,this.getContext=function(){return S},this.getContextAttributes=function(){return S.getContextAttributes()},this.forceContextLoss=function(){let B=yJ.get("WEBGL_lose_context");if(B)B.loseContext()},this.forceContextRestore=function(){let B=yJ.get("WEBGL_lose_context");if(B)B.restoreContext()},this.getPixelRatio=function(){return e},this.setPixelRatio=function(B){if(B===void 0)return;e=B,this.setSize(t,g,!1)},this.getSize=function(B){return B.set(t,g)},this.setSize=function(B,y,b=!0){if($J.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}if(t=B,g=y,$.width=Math.floor(B*e),$.height=Math.floor(y*e),b===!0)$.style.width=B+"px",$.style.height=y+"px";this.setViewport(0,0,B,y)},this.getDrawingBufferSize=function(B){return B.set(t*e,g*e).floor()},this.setDrawingBufferSize=function(B,y,b){t=B,g=y,e=b,$.width=Math.floor(B*b),$.height=Math.floor(y*b),this.setViewport(0,0,B,y)},this.getCurrentViewport=function(B){return B.copy(_)},this.getViewport=function(B){return B.copy(HJ)},this.setViewport=function(B,y,b,p){if(B.isVector4)HJ.set(B.x,B.y,B.z,B.w);else HJ.set(B,y,b,p);YJ.viewport(_.copy(HJ).multiplyScalar(e).round())},this.getScissor=function(B){return B.copy(vJ)},this.setScissor=function(B,y,b,p){if(B.isVector4)vJ.set(B.x,B.y,B.z,B.w);else vJ.set(B,y,b,p);YJ.scissor(P.copy(vJ).multiplyScalar(e).round())},this.getScissorTest=function(){return fJ},this.setScissorTest=function(B){YJ.setScissorTest(fJ=B)},this.setOpaqueSort=function(B){u=B},this.setTransparentSort=function(B){WJ=B},this.getClearColor=function(B){return B.copy(RJ.getClearColor())},this.setClearColor=function(){RJ.setClearColor.apply(RJ,arguments)},this.getClearAlpha=function(){return RJ.getClearAlpha()},this.setClearAlpha=function(){RJ.setClearAlpha.apply(RJ,arguments)},this.clear=function(B=!0,y=!0,b=!0){let p=0;if(B){let j=!1;if(I!==null){let ZJ=I.texture.format;j=ZJ===1033||ZJ===1031||ZJ===1029}if(j){let ZJ=I.texture.type,VJ=ZJ===1009||ZJ===1014||ZJ===1012||ZJ===1020||ZJ===1017||ZJ===1018,_J=RJ.getClearColor(),CJ=RJ.getClearAlpha(),xJ=_J.r,pJ=_J.g,kJ=_J.b;if(VJ)D[0]=xJ,D[1]=pJ,D[2]=kJ,D[3]=CJ,S.clearBufferuiv(S.COLOR,0,D);else O[0]=xJ,O[1]=pJ,O[2]=kJ,O[3]=CJ,S.clearBufferiv(S.COLOR,0,O)}else p|=S.COLOR_BUFFER_BIT}if(y)p|=S.DEPTH_BUFFER_BIT;if(b)p|=S.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295);S.clear(p)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){$.removeEventListener("webglcontextlost",i,!1),$.removeEventListener("webglcontextrestored",r,!1),$.removeEventListener("webglcontextcreationerror",EJ,!1),KJ.dispose(),NJ.dispose(),DJ.dispose(),C.dispose(),R.dispose(),a.dispose(),dJ.dispose(),X0.dispose(),c.dispose(),$J.dispose(),$J.removeEventListener("sessionstart",l0),$J.removeEventListener("sessionend",g9),B6.stop()};function i(B){B.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),k=!0}function r(){console.log("THREE.WebGLRenderer: Context Restored."),k=!1;let B=sJ.autoReset,y=QJ.enabled,b=QJ.autoUpdate,p=QJ.needsUpdate,j=QJ.type;v(),sJ.autoReset=B,QJ.enabled=y,QJ.autoUpdate=b,QJ.needsUpdate=p,QJ.type=j}function EJ(B){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",B.statusMessage)}function qJ(B){let y=B.target;y.removeEventListener("dispose",qJ),mJ(y)}function mJ(B){U0(B),DJ.remove(B)}function U0(B){let y=DJ.get(B).programs;if(y!==void 0){if(y.forEach(function(b){c.releaseProgram(b)}),B.isShaderMaterial)c.releaseShaderCache(B)}}this.renderBufferDirect=function(B,y,b,p,j,ZJ){if(y===null)y=OJ;let VJ=j.isMesh&&j.matrixWorld.determinant()<0,_J=a$(B,y,b,p,j);YJ.setMaterial(p,VJ);let CJ=b.index,xJ=1;if(p.wireframe===!0){if(CJ=s.getWireframeAttribute(b),CJ===void 0)return;xJ=2}let pJ=b.drawRange,kJ=b.attributes.position,iJ=pJ.start*xJ,W0=(pJ.start+pJ.count)*xJ;if(ZJ!==null)iJ=Math.max(iJ,ZJ.start*xJ),W0=Math.min(W0,(ZJ.start+ZJ.count)*xJ);if(CJ!==null)iJ=Math.max(iJ,0),W0=Math.min(W0,CJ.count);else if(kJ!==void 0&&kJ!==null)iJ=Math.max(iJ,0),W0=Math.min(W0,kJ.count);let Y0=W0-iJ;if(Y0<0||Y0===1/0)return;dJ.setup(j,p,_J,b,CJ);let A0,rJ=hJ;if(CJ!==null)A0=h.get(CJ),rJ=MJ,rJ.setIndex(A0);if(j.isMesh)if(p.wireframe===!0)YJ.setLineWidth(p.wireframeLinewidth*zJ()),rJ.setMode(S.LINES);else rJ.setMode(S.TRIANGLES);else if(j.isLine){let IJ=p.linewidth;if(IJ===void 0)IJ=1;if(YJ.setLineWidth(IJ*zJ()),j.isLineSegments)rJ.setMode(S.LINES);else if(j.isLineLoop)rJ.setMode(S.LINE_LOOP);else rJ.setMode(S.LINE_STRIP)}else if(j.isPoints)rJ.setMode(S.POINTS);else if(j.isSprite)rJ.setMode(S.TRIANGLES);if(j.isBatchedMesh)if(j._multiDrawInstances!==null)rJ.renderMultiDrawInstances(j._multiDrawStarts,j._multiDrawCounts,j._multiDrawCount,j._multiDrawInstances);else if(!yJ.get("WEBGL_multi_draw")){let{_multiDrawStarts:IJ,_multiDrawCounts:a0,_multiDrawCount:tJ}=j,f0=CJ?h.get(CJ).bytesPerElement:1,y6=DJ.get(p).currentProgram.getUniforms();for(let I0=0;I0<tJ;I0++)y6.setValue(S,"_gl_DrawID",I0),rJ.render(IJ[I0]/f0,a0[I0])}else rJ.renderMultiDraw(j._multiDrawStarts,j._multiDrawCounts,j._multiDrawCount);else if(j.isInstancedMesh)rJ.renderInstances(iJ,Y0,j.count);else if(b.isInstancedBufferGeometry){let IJ=b._maxInstanceCount!==void 0?b._maxInstanceCount:1/0,a0=Math.min(b.instanceCount,IJ);rJ.renderInstances(iJ,Y0,a0)}else rJ.render(iJ,Y0)};function D0(B,y,b){if(B.transparent===!0&&B.side===2&&B.forceSinglePass===!1)B.side=1,B.needsUpdate=!0,j7(B,y,b),B.side=0,B.needsUpdate=!0,j7(B,y,b),B.side=2;else j7(B,y,b)}this.compile=function(B,y,b=null){if(b===null)b=B;if(F=NJ.get(b),F.init(y),z.push(F),b.traverseVisible(function(j){if(j.isLight&&j.layers.test(y.layers)){if(F.pushLight(j),j.castShadow)F.pushShadow(j)}}),B!==b)B.traverseVisible(function(j){if(j.isLight&&j.layers.test(y.layers)){if(F.pushLight(j),j.castShadow)F.pushShadow(j)}});F.setupLights();let p=new Set;return B.traverse(function(j){if(!(j.isMesh||j.isPoints||j.isLine||j.isSprite))return;let ZJ=j.material;if(ZJ)if(Array.isArray(ZJ))for(let VJ=0;VJ<ZJ.length;VJ++){let _J=ZJ[VJ];D0(_J,b,j),p.add(_J)}else D0(ZJ,b,j),p.add(ZJ)}),z.pop(),F=null,p},this.compileAsync=function(B,y,b=null){let p=this.compile(B,y,b);return new Promise((j)=>{function ZJ(){if(p.forEach(function(VJ){if(DJ.get(VJ).currentProgram.isReady())p.delete(VJ)}),p.size===0){j(B);return}setTimeout(ZJ,10)}if(yJ.get("KHR_parallel_shader_compile")!==null)ZJ();else setTimeout(ZJ,10)})};let aJ=null;function i0(B){if(aJ)aJ(B)}function l0(){B6.stop()}function g9(){B6.start()}let B6=new K$;if(B6.setAnimationLoop(i0),typeof self<"u")B6.setContext(self);this.setAnimationLoop=function(B){aJ=B,$J.setAnimationLoop(B),B===null?B6.stop():B6.start()},$J.addEventListener("sessionstart",l0),$J.addEventListener("sessionend",g9),this.render=function(B,y){if(y!==void 0&&y.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(k===!0)return;if(B.matrixWorldAutoUpdate===!0)B.updateMatrixWorld();if(y.parent===null&&y.matrixWorldAutoUpdate===!0)y.updateMatrixWorld();if($J.enabled===!0&&$J.isPresenting===!0){if($J.cameraAutoUpdate===!0)$J.updateCamera(y);y=$J.getCamera()}if(B.isScene===!0)B.onBeforeRender(N,B,y,I);if(F=NJ.get(B,z.length),F.init(y),z.push(F),UJ.multiplyMatrices(y.projectionMatrix,y.matrixWorldInverse),o.setFromProjectionMatrix(UJ),PJ=this.localClippingEnabled,JJ=bJ.init(this.clippingPlanes,PJ),M=KJ.get(B,E.length),M.init(),E.push(M),$J.enabled===!0&&$J.isPresenting===!0){let ZJ=N.xr.getDepthSensingMesh();if(ZJ!==null)C8(ZJ,y,-1/0,N.sortObjects)}if(C8(B,y,0,N.sortObjects),M.finish(),N.sortObjects===!0)M.sort(u,WJ);if(LJ=$J.enabled===!1||$J.isPresenting===!1||$J.hasDepthSensing()===!1,LJ)RJ.addToRenderList(M,B);if(this.info.render.frame++,JJ===!0)bJ.beginShadows();let b=F.state.shadowsArray;if(QJ.render(b,B,y),JJ===!0)bJ.endShadows();if(this.info.autoReset===!0)this.info.reset();let{opaque:p,transmissive:j}=M;if(F.setupLights(),y.isArrayCamera){let ZJ=y.cameras;if(j.length>0)for(let VJ=0,_J=ZJ.length;VJ<_J;VJ++){let CJ=ZJ[VJ];l9(p,j,B,CJ)}if(LJ)RJ.render(B);for(let VJ=0,_J=ZJ.length;VJ<_J;VJ++){let CJ=ZJ[VJ];p9(M,B,CJ,CJ.viewport)}}else{if(j.length>0)l9(p,j,B,y);if(LJ)RJ.render(B);p9(M,B,y)}if(I!==null)wJ.updateMultisampleRenderTarget(I),wJ.updateRenderTargetMipmap(I);if(B.isScene===!0)B.onAfterRender(N,B,y);if(dJ.resetDefaultState(),x=-1,L=null,z.pop(),z.length>0){if(F=z[z.length-1],JJ===!0)bJ.setGlobalState(N.clippingPlanes,F.state.camera)}else F=null;if(E.pop(),E.length>0)M=E[E.length-1];else M=null};function C8(B,y,b,p){if(B.visible===!1)return;if(B.layers.test(y.layers)){if(B.isGroup)b=B.renderOrder;else if(B.isLOD){if(B.autoUpdate===!0)B.update(y)}else if(B.isLight){if(F.pushLight(B),B.castShadow)F.pushShadow(B)}else if(B.isSprite){if(!B.frustumCulled||o.intersectsSprite(B)){if(p)jJ.setFromMatrixPosition(B.matrixWorld).applyMatrix4(UJ);let VJ=a.update(B),_J=B.material;if(_J.visible)M.push(B,VJ,_J,b,jJ.z,null)}}else if(B.isMesh||B.isLine||B.isPoints){if(!B.frustumCulled||o.intersectsObject(B)){let VJ=a.update(B),_J=B.material;if(p){if(B.boundingSphere!==void 0){if(B.boundingSphere===null)B.computeBoundingSphere();jJ.copy(B.boundingSphere.center)}else{if(VJ.boundingSphere===null)VJ.computeBoundingSphere();jJ.copy(VJ.boundingSphere.center)}jJ.applyMatrix4(B.matrixWorld).applyMatrix4(UJ)}if(Array.isArray(_J)){let CJ=VJ.groups;for(let xJ=0,pJ=CJ.length;xJ<pJ;xJ++){let kJ=CJ[xJ],iJ=_J[kJ.materialIndex];if(iJ&&iJ.visible)M.push(B,VJ,iJ,b,jJ.z,kJ)}}else if(_J.visible)M.push(B,VJ,_J,b,jJ.z,null)}}}let ZJ=B.children;for(let VJ=0,_J=ZJ.length;VJ<_J;VJ++)C8(ZJ[VJ],y,b,p)}function p9(B,y,b,p){let{opaque:j,transmissive:ZJ,transparent:VJ}=B;if(F.setupLightsView(b),JJ===!0)bJ.setGlobalState(N.clippingPlanes,b);if(p)YJ.viewport(_.copy(p));if(j.length>0)v7(j,y,b);if(ZJ.length>0)v7(ZJ,y,b);if(VJ.length>0)v7(VJ,y,b);YJ.buffers.depth.setTest(!0),YJ.buffers.depth.setMask(!0),YJ.buffers.color.setMask(!0),YJ.setPolygonOffset(!1)}function l9(B,y,b,p){if((b.isScene===!0?b.overrideMaterial:null)!==null)return;if(F.state.transmissionRenderTarget[p.id]===void 0)F.state.transmissionRenderTarget[p.id]=new M6(1,1,{generateMipmaps:!0,type:yJ.has("EXT_color_buffer_half_float")||yJ.has("EXT_color_buffer_float")?1016:1009,minFilter:1008,samples:4,stencilBuffer:W,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:oJ.workingColorSpace});let ZJ=F.state.transmissionRenderTarget[p.id],VJ=p.viewport||_;ZJ.setSize(VJ.z,VJ.w);let _J=N.getRenderTarget();if(N.setRenderTarget(ZJ),N.getClearColor(m),d=N.getClearAlpha(),d<1)N.setClearColor(16777215,0.5);if(N.clear(),LJ)RJ.render(b);let CJ=N.toneMapping;N.toneMapping=0;let xJ=p.viewport;if(p.viewport!==void 0)p.viewport=void 0;if(F.setupLightsView(p),JJ===!0)bJ.setGlobalState(N.clippingPlanes,p);if(v7(B,b,p),wJ.updateMultisampleRenderTarget(ZJ),wJ.updateRenderTargetMipmap(ZJ),yJ.has("WEBGL_multisampled_render_to_texture")===!1){let pJ=!1;for(let kJ=0,iJ=y.length;kJ<iJ;kJ++){let W0=y[kJ],Y0=W0.object,A0=W0.geometry,rJ=W0.material,IJ=W0.group;if(rJ.side===2&&Y0.layers.test(p.layers)){let a0=rJ.side;rJ.side=1,rJ.needsUpdate=!0,m9(Y0,b,p,A0,rJ,IJ),rJ.side=a0,rJ.needsUpdate=!0,pJ=!0}}if(pJ===!0)wJ.updateMultisampleRenderTarget(ZJ),wJ.updateRenderTargetMipmap(ZJ)}if(N.setRenderTarget(_J),N.setClearColor(m,d),xJ!==void 0)p.viewport=xJ;N.toneMapping=CJ}function v7(B,y,b){let p=y.isScene===!0?y.overrideMaterial:null;for(let j=0,ZJ=B.length;j<ZJ;j++){let VJ=B[j],_J=VJ.object,CJ=VJ.geometry,xJ=p===null?VJ.material:p,pJ=VJ.group;if(_J.layers.test(b.layers))m9(_J,y,b,CJ,xJ,pJ)}}function m9(B,y,b,p,j,ZJ){if(B.onBeforeRender(N,y,b,p,j,ZJ),B.modelViewMatrix.multiplyMatrices(b.matrixWorldInverse,B.matrixWorld),B.normalMatrix.getNormalMatrix(B.modelViewMatrix),j.onBeforeRender(N,y,b,p,B,ZJ),j.transparent===!0&&j.side===2&&j.forceSinglePass===!1)j.side=1,j.needsUpdate=!0,N.renderBufferDirect(b,y,p,j,B,ZJ),j.side=0,j.needsUpdate=!0,N.renderBufferDirect(b,y,p,j,B,ZJ),j.side=2;else N.renderBufferDirect(b,y,p,j,B,ZJ);B.onAfterRender(N,y,b,p,j,ZJ)}function j7(B,y,b){if(y.isScene!==!0)y=OJ;let p=DJ.get(B),j=F.state.lights,ZJ=F.state.shadowsArray,VJ=j.state.version,_J=c.getParameters(B,j.state,ZJ,y,b),CJ=c.getProgramCacheKey(_J),xJ=p.programs;if(p.environment=B.isMeshStandardMaterial?y.environment:null,p.fog=y.fog,p.envMap=(B.isMeshStandardMaterial?R:C).get(B.envMap||p.environment),p.envMapRotation=p.environment!==null&&B.envMap===null?y.environmentRotation:B.envMapRotation,xJ===void 0)B.addEventListener("dispose",qJ),xJ=new Map,p.programs=xJ;let pJ=xJ.get(CJ);if(pJ!==void 0){if(p.currentProgram===pJ&&p.lightsStateVersion===VJ)return d9(B,_J),pJ}else _J.uniforms=c.getUniforms(B),B.onBeforeCompile(_J,N),pJ=c.acquireProgram(_J,CJ),xJ.set(CJ,pJ),p.uniforms=_J.uniforms;let kJ=p.uniforms;if(!B.isShaderMaterial&&!B.isRawShaderMaterial||B.clipping===!0)kJ.clippingPlanes=bJ.uniform;if(d9(B,_J),p.needsLights=t$(B),p.lightsStateVersion=VJ,p.needsLights)kJ.ambientLightColor.value=j.state.ambient,kJ.lightProbe.value=j.state.probe,kJ.directionalLights.value=j.state.directional,kJ.directionalLightShadows.value=j.state.directionalShadow,kJ.spotLights.value=j.state.spot,kJ.spotLightShadows.value=j.state.spotShadow,kJ.rectAreaLights.value=j.state.rectArea,kJ.ltc_1.value=j.state.rectAreaLTC1,kJ.ltc_2.value=j.state.rectAreaLTC2,kJ.pointLights.value=j.state.point,kJ.pointLightShadows.value=j.state.pointShadow,kJ.hemisphereLights.value=j.state.hemi,kJ.directionalShadowMap.value=j.state.directionalShadowMap,kJ.directionalShadowMatrix.value=j.state.directionalShadowMatrix,kJ.spotShadowMap.value=j.state.spotShadowMap,kJ.spotLightMatrix.value=j.state.spotLightMatrix,kJ.spotLightMap.value=j.state.spotLightMap,kJ.pointShadowMap.value=j.state.pointShadowMap,kJ.pointShadowMatrix.value=j.state.pointShadowMatrix;return p.currentProgram=pJ,p.uniformsList=null,pJ}function u9(B){if(B.uniformsList===null){let y=B.currentProgram.getUniforms();B.uniformsList=_7.seqWithValue(y.seq,B.uniforms)}return B.uniformsList}function d9(B,y){let b=DJ.get(B);b.outputColorSpace=y.outputColorSpace,b.batching=y.batching,b.batchingColor=y.batchingColor,b.instancing=y.instancing,b.instancingColor=y.instancingColor,b.instancingMorph=y.instancingMorph,b.skinning=y.skinning,b.morphTargets=y.morphTargets,b.morphNormals=y.morphNormals,b.morphColors=y.morphColors,b.morphTargetsCount=y.morphTargetsCount,b.numClippingPlanes=y.numClippingPlanes,b.numIntersection=y.numClipIntersection,b.vertexAlphas=y.vertexAlphas,b.vertexTangents=y.vertexTangents,b.toneMapping=y.toneMapping}function a$(B,y,b,p,j){if(y.isScene!==!0)y=OJ;wJ.resetTextureUnits();let ZJ=y.fog,VJ=p.isMeshStandardMaterial?y.environment:null,_J=I===null?N.outputColorSpace:I.isXRRenderTarget===!0?I.texture.colorSpace:"srgb-linear",CJ=(p.isMeshStandardMaterial?R:C).get(p.envMap||VJ),xJ=p.vertexColors===!0&&!!b.attributes.color&&b.attributes.color.itemSize===4,pJ=!!b.attributes.tangent&&(!!p.normalMap||p.anisotropy>0),kJ=!!b.morphAttributes.position,iJ=!!b.morphAttributes.normal,W0=!!b.morphAttributes.color,Y0=0;if(p.toneMapped){if(I===null||I.isXRRenderTarget===!0)Y0=N.toneMapping}let A0=b.morphAttributes.position||b.morphAttributes.normal||b.morphAttributes.color,rJ=A0!==void 0?A0.length:0,IJ=DJ.get(p),a0=F.state.lights;if(JJ===!0){if(PJ===!0||B!==L){let S0=B===L&&p.id===x;bJ.setState(p,B,S0)}}let tJ=!1;if(p.version===IJ.__version){if(IJ.needsLights&&IJ.lightsStateVersion!==a0.state.version)tJ=!0;else if(IJ.outputColorSpace!==_J)tJ=!0;else if(j.isBatchedMesh&&IJ.batching===!1)tJ=!0;else if(!j.isBatchedMesh&&IJ.batching===!0)tJ=!0;else if(j.isBatchedMesh&&IJ.batchingColor===!0&&j.colorTexture===null)tJ=!0;else if(j.isBatchedMesh&&IJ.batchingColor===!1&&j.colorTexture!==null)tJ=!0;else if(j.isInstancedMesh&&IJ.instancing===!1)tJ=!0;else if(!j.isInstancedMesh&&IJ.instancing===!0)tJ=!0;else if(j.isSkinnedMesh&&IJ.skinning===!1)tJ=!0;else if(!j.isSkinnedMesh&&IJ.skinning===!0)tJ=!0;else if(j.isInstancedMesh&&IJ.instancingColor===!0&&j.instanceColor===null)tJ=!0;else if(j.isInstancedMesh&&IJ.instancingColor===!1&&j.instanceColor!==null)tJ=!0;else if(j.isInstancedMesh&&IJ.instancingMorph===!0&&j.morphTexture===null)tJ=!0;else if(j.isInstancedMesh&&IJ.instancingMorph===!1&&j.morphTexture!==null)tJ=!0;else if(IJ.envMap!==CJ)tJ=!0;else if(p.fog===!0&&IJ.fog!==ZJ)tJ=!0;else if(IJ.numClippingPlanes!==void 0&&(IJ.numClippingPlanes!==bJ.numPlanes||IJ.numIntersection!==bJ.numIntersection))tJ=!0;else if(IJ.vertexAlphas!==xJ)tJ=!0;else if(IJ.vertexTangents!==pJ)tJ=!0;else if(IJ.morphTargets!==kJ)tJ=!0;else if(IJ.morphNormals!==iJ)tJ=!0;else if(IJ.morphColors!==W0)tJ=!0;else if(IJ.toneMapping!==Y0)tJ=!0;else if(IJ.morphTargetsCount!==rJ)tJ=!0}else tJ=!0,IJ.__version=p.version;let f0=IJ.currentProgram;if(tJ===!0)f0=j7(p,y,j);let y6=!1,I0=!1,G7=!1,K0=f0.getUniforms(),m0=IJ.uniforms;if(YJ.useProgram(f0.program))y6=!0,I0=!0,G7=!0;if(p.id!==x)x=p.id,I0=!0;if(y6||L!==B){if(YJ.buffers.depth.getReversed())SJ.copy(B.projectionMatrix),QQ(SJ),ZQ(SJ),K0.setValue(S,"projectionMatrix",SJ);else K0.setValue(S,"projectionMatrix",B.projectionMatrix);K0.setValue(S,"viewMatrix",B.matrixWorldInverse);let H6=K0.map.cameraPosition;if(H6!==void 0)H6.setValue(S,T.setFromMatrixPosition(B.matrixWorld));if(AJ.logarithmicDepthBuffer)K0.setValue(S,"logDepthBufFC",2/(Math.log(B.far+1)/Math.LN2));if(p.isMeshPhongMaterial||p.isMeshToonMaterial||p.isMeshLambertMaterial||p.isMeshBasicMaterial||p.isMeshStandardMaterial||p.isShaderMaterial)K0.setValue(S,"isOrthographic",B.isOrthographicCamera===!0);if(L!==B)L=B,I0=!0,G7=!0}if(j.isSkinnedMesh){K0.setOptional(S,j,"bindMatrix"),K0.setOptional(S,j,"bindMatrixInverse");let S0=j.skeleton;if(S0){if(S0.boneTexture===null)S0.computeBoneTexture();K0.setValue(S,"boneTexture",S0.boneTexture,wJ)}}if(j.isBatchedMesh){if(K0.setOptional(S,j,"batchingTexture"),K0.setValue(S,"batchingTexture",j._matricesTexture,wJ),K0.setOptional(S,j,"batchingIdTexture"),K0.setValue(S,"batchingIdTexture",j._indirectTexture,wJ),K0.setOptional(S,j,"batchingColorTexture"),j._colorsTexture!==null)K0.setValue(S,"batchingColorTexture",j._colorsTexture,wJ)}let q7=b.morphAttributes;if(q7.position!==void 0||q7.normal!==void 0||q7.color!==void 0)nJ.update(j,b,f0);if(I0||IJ.receiveShadow!==j.receiveShadow)IJ.receiveShadow=j.receiveShadow,K0.setValue(S,"receiveShadow",j.receiveShadow);if(p.isMeshGouraudMaterial&&p.envMap!==null)m0.envMap.value=CJ,m0.flipEnvMap.value=CJ.isCubeTexture&&CJ.isRenderTargetTexture===!1?-1:1;if(p.isMeshStandardMaterial&&p.envMap===null&&y.environment!==null)m0.envMapIntensity.value=y.environmentIntensity;if(I0){if(K0.setValue(S,"toneMappingExposure",N.toneMappingExposure),IJ.needsLights)r$(m0,G7);if(ZJ&&p.fog===!0)FJ.refreshFogUniforms(m0,ZJ);FJ.refreshMaterialUniforms(m0,p,e,g,F.state.transmissionRenderTarget[B.id]),_7.upload(S,u9(IJ),m0,wJ)}if(p.isShaderMaterial&&p.uniformsNeedUpdate===!0)_7.upload(S,u9(IJ),m0,wJ),p.uniformsNeedUpdate=!1;if(p.isSpriteMaterial)K0.setValue(S,"center",j.center);if(K0.setValue(S,"modelViewMatrix",j.modelViewMatrix),K0.setValue(S,"normalMatrix",j.normalMatrix),K0.setValue(S,"modelMatrix",j.matrixWorld),p.isShaderMaterial||p.isRawShaderMaterial){let S0=p.uniformsGroups;for(let H6=0,G6=S0.length;H6<G6;H6++){let c9=S0[H6];X0.update(c9,f0),X0.bind(c9,f0)}}return f0}function r$(B,y){B.ambientLightColor.needsUpdate=y,B.lightProbe.needsUpdate=y,B.directionalLights.needsUpdate=y,B.directionalLightShadows.needsUpdate=y,B.pointLights.needsUpdate=y,B.pointLightShadows.needsUpdate=y,B.spotLights.needsUpdate=y,B.spotLightShadows.needsUpdate=y,B.rectAreaLights.needsUpdate=y,B.hemisphereLights.needsUpdate=y}function t$(B){return B.isMeshLambertMaterial||B.isMeshToonMaterial||B.isMeshPhongMaterial||B.isMeshStandardMaterial||B.isShadowMaterial||B.isShaderMaterial&&B.lights===!0}if(this.getActiveCubeFace=function(){return f},this.getActiveMipmapLevel=function(){return w},this.getRenderTarget=function(){return I},this.setRenderTargetTextures=function(B,y,b){DJ.get(B.texture).__webglTexture=y,DJ.get(B.depthTexture).__webglTexture=b;let p=DJ.get(B);if(p.__hasExternalTextures=!0,p.__autoAllocateDepthBuffer=b===void 0,!p.__autoAllocateDepthBuffer){if(yJ.has("WEBGL_multisampled_render_to_texture")===!0)console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),p.__useRenderToTexture=!1}},this.setRenderTargetFramebuffer=function(B,y){let b=DJ.get(B);b.__webglFramebuffer=y,b.__useDefaultFramebuffer=y===void 0},this.setRenderTarget=function(B,y=0,b=0){I=B,f=y,w=b;let p=!0,j=null,ZJ=!1,VJ=!1;if(B){let CJ=DJ.get(B);if(CJ.__useDefaultFramebuffer!==void 0)YJ.bindFramebuffer(S.FRAMEBUFFER,null),p=!1;else if(CJ.__webglFramebuffer===void 0)wJ.setupRenderTarget(B);else if(CJ.__hasExternalTextures)wJ.rebindTextures(B,DJ.get(B.texture).__webglTexture,DJ.get(B.depthTexture).__webglTexture);else if(B.depthBuffer){let kJ=B.depthTexture;if(CJ.__boundDepthTexture!==kJ){if(kJ!==null&&DJ.has(kJ)&&(B.width!==kJ.image.width||B.height!==kJ.image.height))throw Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");wJ.setupDepthRenderbuffer(B)}}let xJ=B.texture;if(xJ.isData3DTexture||xJ.isDataArrayTexture||xJ.isCompressedArrayTexture)VJ=!0;let pJ=DJ.get(B).__webglFramebuffer;if(B.isWebGLCubeRenderTarget){if(Array.isArray(pJ[y]))j=pJ[y][b];else j=pJ[y];ZJ=!0}else if(B.samples>0&&wJ.useMultisampledRTT(B)===!1)j=DJ.get(B).__webglMultisampledFramebuffer;else if(Array.isArray(pJ))j=pJ[b];else j=pJ;_.copy(B.viewport),P.copy(B.scissor),l=B.scissorTest}else _.copy(HJ).multiplyScalar(e).floor(),P.copy(vJ).multiplyScalar(e).floor(),l=fJ;if(YJ.bindFramebuffer(S.FRAMEBUFFER,j)&&p)YJ.drawBuffers(B,j);if(YJ.viewport(_),YJ.scissor(P),YJ.setScissorTest(l),ZJ){let CJ=DJ.get(B.texture);S.framebufferTexture2D(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0,S.TEXTURE_CUBE_MAP_POSITIVE_X+y,CJ.__webglTexture,b)}else if(VJ){let CJ=DJ.get(B.texture),xJ=y||0;S.framebufferTextureLayer(S.FRAMEBUFFER,S.COLOR_ATTACHMENT0,CJ.__webglTexture,b||0,xJ)}x=-1},this.readRenderTargetPixels=function(B,y,b,p,j,ZJ,VJ){if(!(B&&B.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let _J=DJ.get(B).__webglFramebuffer;if(B.isWebGLCubeRenderTarget&&VJ!==void 0)_J=_J[VJ];if(_J){YJ.bindFramebuffer(S.FRAMEBUFFER,_J);try{let CJ=B.texture,xJ=CJ.format,pJ=CJ.type;if(!AJ.textureFormatReadable(xJ)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!AJ.textureTypeReadable(pJ)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}if(y>=0&&y<=B.width-p&&(b>=0&&b<=B.height-j))S.readPixels(y,b,p,j,gJ.convert(xJ),gJ.convert(pJ),ZJ)}finally{let CJ=I!==null?DJ.get(I).__webglFramebuffer:null;YJ.bindFramebuffer(S.FRAMEBUFFER,CJ)}}},this.readRenderTargetPixelsAsync=async function(B,y,b,p,j,ZJ,VJ){if(!(B&&B.isWebGLRenderTarget))throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let _J=DJ.get(B).__webglFramebuffer;if(B.isWebGLCubeRenderTarget&&VJ!==void 0)_J=_J[VJ];if(_J){let CJ=B.texture,xJ=CJ.format,pJ=CJ.type;if(!AJ.textureFormatReadable(xJ))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!AJ.textureTypeReadable(pJ))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");if(y>=0&&y<=B.width-p&&(b>=0&&b<=B.height-j)){YJ.bindFramebuffer(S.FRAMEBUFFER,_J);let kJ=S.createBuffer();S.bindBuffer(S.PIXEL_PACK_BUFFER,kJ),S.bufferData(S.PIXEL_PACK_BUFFER,ZJ.byteLength,S.STREAM_READ),S.readPixels(y,b,p,j,gJ.convert(xJ),gJ.convert(pJ),0);let iJ=I!==null?DJ.get(I).__webglFramebuffer:null;YJ.bindFramebuffer(S.FRAMEBUFFER,iJ);let W0=S.fenceSync(S.SYNC_GPU_COMMANDS_COMPLETE,0);return S.flush(),await $Q(S,W0,4),S.bindBuffer(S.PIXEL_PACK_BUFFER,kJ),S.getBufferSubData(S.PIXEL_PACK_BUFFER,0,ZJ),S.deleteBuffer(kJ),S.deleteSync(W0),ZJ}else throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")}},this.copyFramebufferToTexture=function(B,y=null,b=0){if(B.isTexture!==!0)L7("WebGLRenderer: copyFramebufferToTexture function signature has changed."),y=arguments[0]||null,B=arguments[1];let p=Math.pow(2,-b),j=Math.floor(B.image.width*p),ZJ=Math.floor(B.image.height*p),VJ=y!==null?y.x:0,_J=y!==null?y.y:0;wJ.setTexture2D(B,0),S.copyTexSubImage2D(S.TEXTURE_2D,b,0,0,VJ,_J,j,ZJ),YJ.unbindTexture()},this.copyTextureToTexture=function(B,y,b=null,p=null,j=0){if(B.isTexture!==!0)L7("WebGLRenderer: copyTextureToTexture function signature has changed."),p=arguments[0]||null,B=arguments[1],y=arguments[2],j=arguments[3]||0,b=null;let ZJ,VJ,_J,CJ,xJ,pJ,kJ,iJ,W0,Y0=B.isCompressedTexture?B.mipmaps[j]:B.image;if(b!==null)ZJ=b.max.x-b.min.x,VJ=b.max.y-b.min.y,_J=b.isBox3?b.max.z-b.min.z:1,CJ=b.min.x,xJ=b.min.y,pJ=b.isBox3?b.min.z:0;else ZJ=Y0.width,VJ=Y0.height,_J=Y0.depth||1,CJ=0,xJ=0,pJ=0;if(p!==null)kJ=p.x,iJ=p.y,W0=p.z;else kJ=0,iJ=0,W0=0;let A0=gJ.convert(y.format),rJ=gJ.convert(y.type),IJ;if(y.isData3DTexture)wJ.setTexture3D(y,0),IJ=S.TEXTURE_3D;else if(y.isDataArrayTexture||y.isCompressedArrayTexture)wJ.setTexture2DArray(y,0),IJ=S.TEXTURE_2D_ARRAY;else wJ.setTexture2D(y,0),IJ=S.TEXTURE_2D;S.pixelStorei(S.UNPACK_FLIP_Y_WEBGL,y.flipY),S.pixelStorei(S.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),S.pixelStorei(S.UNPACK_ALIGNMENT,y.unpackAlignment);let a0=S.getParameter(S.UNPACK_ROW_LENGTH),tJ=S.getParameter(S.UNPACK_IMAGE_HEIGHT),f0=S.getParameter(S.UNPACK_SKIP_PIXELS),y6=S.getParameter(S.UNPACK_SKIP_ROWS),I0=S.getParameter(S.UNPACK_SKIP_IMAGES);S.pixelStorei(S.UNPACK_ROW_LENGTH,Y0.width),S.pixelStorei(S.UNPACK_IMAGE_HEIGHT,Y0.height),S.pixelStorei(S.UNPACK_SKIP_PIXELS,CJ),S.pixelStorei(S.UNPACK_SKIP_ROWS,xJ),S.pixelStorei(S.UNPACK_SKIP_IMAGES,pJ);let G7=B.isDataArrayTexture||B.isData3DTexture,K0=y.isDataArrayTexture||y.isData3DTexture;if(B.isRenderTargetTexture||B.isDepthTexture){let m0=DJ.get(B),q7=DJ.get(y),S0=DJ.get(m0.__renderTarget),H6=DJ.get(q7.__renderTarget);YJ.bindFramebuffer(S.READ_FRAMEBUFFER,S0.__webglFramebuffer),YJ.bindFramebuffer(S.DRAW_FRAMEBUFFER,H6.__webglFramebuffer);for(let G6=0;G6<_J;G6++){if(G7)S.framebufferTextureLayer(S.READ_FRAMEBUFFER,S.COLOR_ATTACHMENT0,DJ.get(B).__webglTexture,j,pJ+G6);if(B.isDepthTexture){if(K0)S.framebufferTextureLayer(S.DRAW_FRAMEBUFFER,S.COLOR_ATTACHMENT0,DJ.get(y).__webglTexture,j,W0+G6);S.blitFramebuffer(CJ,xJ,ZJ,VJ,kJ,iJ,ZJ,VJ,S.DEPTH_BUFFER_BIT,S.NEAREST)}else if(K0)S.copyTexSubImage3D(IJ,j,kJ,iJ,W0+G6,CJ,xJ,ZJ,VJ);else S.copyTexSubImage2D(IJ,j,kJ,iJ,W0+G6,CJ,xJ,ZJ,VJ)}YJ.bindFramebuffer(S.READ_FRAMEBUFFER,null),YJ.bindFramebuffer(S.DRAW_FRAMEBUFFER,null)}else if(K0)if(B.isDataTexture||B.isData3DTexture)S.texSubImage3D(IJ,j,kJ,iJ,W0,ZJ,VJ,_J,A0,rJ,Y0.data);else if(y.isCompressedArrayTexture)S.compressedTexSubImage3D(IJ,j,kJ,iJ,W0,ZJ,VJ,_J,A0,Y0.data);else S.texSubImage3D(IJ,j,kJ,iJ,W0,ZJ,VJ,_J,A0,rJ,Y0);else if(B.isDataTexture)S.texSubImage2D(S.TEXTURE_2D,j,kJ,iJ,ZJ,VJ,A0,rJ,Y0.data);else if(B.isCompressedTexture)S.compressedTexSubImage2D(S.TEXTURE_2D,j,kJ,iJ,Y0.width,Y0.height,A0,Y0.data);else S.texSubImage2D(S.TEXTURE_2D,j,kJ,iJ,ZJ,VJ,A0,rJ,Y0);if(S.pixelStorei(S.UNPACK_ROW_LENGTH,a0),S.pixelStorei(S.UNPACK_IMAGE_HEIGHT,tJ),S.pixelStorei(S.UNPACK_SKIP_PIXELS,f0),S.pixelStorei(S.UNPACK_SKIP_ROWS,y6),S.pixelStorei(S.UNPACK_SKIP_IMAGES,I0),j===0&&y.generateMipmaps)S.generateMipmap(IJ);YJ.unbindTexture()},this.copyTextureToTexture3D=function(B,y,b=null,p=null,j=0){if(B.isTexture!==!0)L7("WebGLRenderer: copyTextureToTexture3D function signature has changed."),b=arguments[0]||null,p=arguments[1]||null,B=arguments[2],y=arguments[3],j=arguments[4]||0;return L7('WebGLRenderer: copyTextureToTexture3D function has been deprecated. Use "copyTextureToTexture" instead.'),this.copyTextureToTexture(B,y,b,p,j)},this.initRenderTarget=function(B){if(DJ.get(B).__webglFramebuffer===void 0)wJ.setupRenderTarget(B)},this.initTexture=function(B){if(B.isCubeTexture)wJ.setTextureCube(B,0);else if(B.isData3DTexture)wJ.setTexture3D(B,0);else if(B.isDataArrayTexture||B.isCompressedArrayTexture)wJ.setTexture2DArray(B,0);else wJ.setTexture2D(B,0);YJ.unbindTexture()},this.resetState=function(){f=0,w=0,I=null,YJ.reset(),dJ.reset()},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return 2000}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(J){this._outputColorSpace=J;let $=this.getContext();$.drawingBufferColorspace=oJ._getDrawingBufferColorSpace(J),$.unpackColorSpace=oJ._getUnpackColorSpace()}}class E8{constructor(J,$=1,Q=1000){this.isFog=!0,this.name="",this.color=new cJ(J),this.near=$,this.far=Q}clone(){return new E8(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class O9 extends q0{constructor(){super();if(this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new c0,this.environmentIntensity=1,this.environmentRotation=new c0,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(J,$){if(super.copy(J,$),J.background!==null)this.background=J.background.clone();if(J.environment!==null)this.environment=J.environment.clone();if(J.fog!==null)this.fog=J.fog.clone();if(this.backgroundBlurriness=J.backgroundBlurriness,this.backgroundIntensity=J.backgroundIntensity,this.backgroundRotation.copy(J.backgroundRotation),this.environmentIntensity=J.environmentIntensity,this.environmentRotation.copy(J.environmentRotation),J.overrideMaterial!==null)this.overrideMaterial=J.overrideMaterial.clone();return this.matrixAutoUpdate=J.matrixAutoUpdate,this}toJSON(J){let $=super.toJSON(J);if(this.fog!==null)$.object.fog=this.fog.toJSON();if(this.backgroundBlurriness>0)$.object.backgroundBlurriness=this.backgroundBlurriness;if(this.backgroundIntensity!==1)$.object.backgroundIntensity=this.backgroundIntensity;if($.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1)$.object.environmentIntensity=this.environmentIntensity;return $.object.environmentRotation=this.environmentRotation.toArray(),$}}class M9{constructor(J,$){this.isInterleavedBuffer=!0,this.array=J,this.stride=$,this.count=J!==void 0?J.length/$:0,this.usage=35044,this.updateRanges=[],this.version=0,this.uuid=O6()}onUploadCallback(){}set needsUpdate(J){if(J===!0)this.version++}setUsage(J){return this.usage=J,this}addUpdateRange(J,$){this.updateRanges.push({start:J,count:$})}clearUpdateRanges(){this.updateRanges.length=0}copy(J){return this.array=new J.array.constructor(J.array),this.count=J.count,this.stride=J.stride,this.usage=J.usage,this}copyAt(J,$,Q){J*=this.stride,Q*=$.stride;for(let Z=0,W=this.stride;Z<W;Z++)this.array[J+Z]=$.array[Q+Z];return this}set(J,$=0){return this.array.set(J,$),this}clone(J){if(J.arrayBuffers===void 0)J.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=O6();if(J.arrayBuffers[this.array.buffer._uuid]===void 0)J.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer;let $=new this.array.constructor(J.arrayBuffers[this.array.buffer._uuid]),Q=new this.constructor($,this.stride);return Q.setUsage(this.usage),Q}onUpload(J){return this.onUploadCallback=J,this}toJSON(J){if(J.arrayBuffers===void 0)J.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=O6();if(J.arrayBuffers[this.array.buffer._uuid]===void 0)J.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer));return{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}var _0=new A;class A7{constructor(J,$,Q,Z=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=J,this.itemSize=$,this.offset=Q,this.normalized=Z}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(J){this.data.needsUpdate=J}applyMatrix4(J){for(let $=0,Q=this.data.count;$<Q;$++)_0.fromBufferAttribute(this,$),_0.applyMatrix4(J),this.setXYZ($,_0.x,_0.y,_0.z);return this}applyNormalMatrix(J){for(let $=0,Q=this.count;$<Q;$++)_0.fromBufferAttribute(this,$),_0.applyNormalMatrix(J),this.setXYZ($,_0.x,_0.y,_0.z);return this}transformDirection(J){for(let $=0,Q=this.count;$<Q;$++)_0.fromBufferAttribute(this,$),_0.transformDirection(J),this.setXYZ($,_0.x,_0.y,_0.z);return this}getComponent(J,$){let Q=this.array[J*this.data.stride+this.offset+$];if(this.normalized)Q=d0(Q,this.array);return Q}setComponent(J,$,Q){if(this.normalized)Q=J0(Q,this.array);return this.data.array[J*this.data.stride+this.offset+$]=Q,this}setX(J,$){if(this.normalized)$=J0($,this.array);return this.data.array[J*this.data.stride+this.offset]=$,this}setY(J,$){if(this.normalized)$=J0($,this.array);return this.data.array[J*this.data.stride+this.offset+1]=$,this}setZ(J,$){if(this.normalized)$=J0($,this.array);return this.data.array[J*this.data.stride+this.offset+2]=$,this}setW(J,$){if(this.normalized)$=J0($,this.array);return this.data.array[J*this.data.stride+this.offset+3]=$,this}getX(J){let $=this.data.array[J*this.data.stride+this.offset];if(this.normalized)$=d0($,this.array);return $}getY(J){let $=this.data.array[J*this.data.stride+this.offset+1];if(this.normalized)$=d0($,this.array);return $}getZ(J){let $=this.data.array[J*this.data.stride+this.offset+2];if(this.normalized)$=d0($,this.array);return $}getW(J){let $=this.data.array[J*this.data.stride+this.offset+3];if(this.normalized)$=d0($,this.array);return $}setXY(J,$,Q){if(J=J*this.data.stride+this.offset,this.normalized)$=J0($,this.array),Q=J0(Q,this.array);return this.data.array[J+0]=$,this.data.array[J+1]=Q,this}setXYZ(J,$,Q,Z){if(J=J*this.data.stride+this.offset,this.normalized)$=J0($,this.array),Q=J0(Q,this.array),Z=J0(Z,this.array);return this.data.array[J+0]=$,this.data.array[J+1]=Q,this.data.array[J+2]=Z,this}setXYZW(J,$,Q,Z,W){if(J=J*this.data.stride+this.offset,this.normalized)$=J0($,this.array),Q=J0(Q,this.array),Z=J0(Z,this.array),W=J0(W,this.array);return this.data.array[J+0]=$,this.data.array[J+1]=Q,this.data.array[J+2]=Z,this.data.array[J+3]=W,this}clone(J){if(J===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let $=[];for(let Q=0;Q<this.count;Q++){let Z=Q*this.data.stride+this.offset;for(let W=0;W<this.itemSize;W++)$.push(this.data.array[Z+W])}return new k0(new this.array.constructor($),this.itemSize,this.normalized)}else{if(J.interleavedBuffers===void 0)J.interleavedBuffers={};if(J.interleavedBuffers[this.data.uuid]===void 0)J.interleavedBuffers[this.data.uuid]=this.data.clone(J);return new A7(J.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}}toJSON(J){if(J===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let $=[];for(let Q=0;Q<this.count;Q++){let Z=Q*this.data.stride+this.offset;for(let W=0;W<this.itemSize;W++)$.push(this.data.array[Z+W])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:$,normalized:this.normalized}}else{if(J.interleavedBuffers===void 0)J.interleavedBuffers={};if(J.interleavedBuffers[this.data.uuid]===void 0)J.interleavedBuffers[this.data.uuid]=this.data.toJSON(J);return{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}}class I7 extends S6{static get type(){return"SpriteMaterial"}constructor(J){super();this.isSpriteMaterial=!0,this.color=new cJ(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.alphaMap=J.alphaMap,this.rotation=J.rotation,this.sizeAttenuation=J.sizeAttenuation,this.fog=J.fog,this}}var o6,R7=new A,i6=new A,a6=new A,r6=new BJ,N7=new BJ,L$=new Q0,J8=new A,O7=new A,$8=new A,h5=new BJ,e8=new BJ,x5=new BJ;class F8 extends q0{constructor(J=new I7){super();if(this.isSprite=!0,this.type="Sprite",o6===void 0){o6=new R0;let $=new Float32Array([-0.5,-0.5,0,0,0,0.5,-0.5,0,1,0,0.5,0.5,0,1,1,-0.5,0.5,0,0,1]),Q=new M9($,5);o6.setIndex([0,1,2,0,2,3]),o6.setAttribute("position",new A7(Q,3,0,!1)),o6.setAttribute("uv",new A7(Q,2,3,!1))}this.geometry=o6,this.material=J,this.center=new BJ(0.5,0.5)}raycast(J,$){if(J.camera===null)console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.');if(i6.setFromMatrixScale(this.matrixWorld),L$.copy(J.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(J.camera.matrixWorldInverse,this.matrixWorld),a6.setFromMatrixPosition(this.modelViewMatrix),J.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1)i6.multiplyScalar(-a6.z);let Q=this.material.rotation,Z,W;if(Q!==0)W=Math.cos(Q),Z=Math.sin(Q);let Y=this.center;Q8(J8.set(-0.5,-0.5,0),a6,Y,i6,Z,W),Q8(O7.set(0.5,-0.5,0),a6,Y,i6,Z,W),Q8($8.set(0.5,0.5,0),a6,Y,i6,Z,W),h5.set(0,0),e8.set(1,0),x5.set(1,1);let K=J.ray.intersectTriangle(J8,O7,$8,!1,R7);if(K===null){if(Q8(O7.set(-0.5,0.5,0),a6,Y,i6,Z,W),e8.set(0,1),K=J.ray.intersectTriangle(J8,$8,O7,!1,R7),K===null)return}let X=J.ray.origin.distanceTo(R7);if(X<J.near||X>J.far)return;$.push({distance:X,point:R7.clone(),uv:y0.getInterpolation(R7,J8,O7,$8,h5,e8,x5,new BJ),face:null,object:this})}copy(J,$){if(super.copy(J,$),J.center!==void 0)this.center.copy(J.center);return this.material=J.material,this}}function Q8(J,$,Q,Z,W,Y){if(r6.subVectors(J,Q).addScalar(0.5).multiply(Z),W!==void 0)N7.x=Y*r6.x-W*r6.y,N7.y=W*r6.x+Y*r6.y;else N7.copy(r6);J.copy($),J.x+=N7.x,J.y+=N7.y,J.applyMatrix4(L$)}class z$ extends L0{constructor(J=null,$=1,Q=1,Z,W,Y,K,X,U=1003,H=1003,G,V){super(null,Y,K,X,U,H,Z,W,G,V);this.isDataTexture=!0,this.image={data:J,width:$,height:Q},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class U8 extends k0{constructor(J,$,Q,Z=1){super(J,$,Q);this.isInstancedBufferAttribute=!0,this.meshPerAttribute=Z}copy(J){return super.copy(J),this.meshPerAttribute=J.meshPerAttribute,this}toJSON(){let J=super.toJSON();return J.meshPerAttribute=this.meshPerAttribute,J.isInstancedBufferAttribute=!0,J}}var t6=new Q0,b5=new Q0,Z8=[],g5=new n0,r4=new Q0,M7=new TJ,B7=new Q7;class B9 extends TJ{constructor(J,$,Q){super(J,$);this.isInstancedMesh=!0,this.instanceMatrix=new U8(new Float32Array(Q*16),16),this.instanceColor=null,this.morphTexture=null,this.count=Q,this.boundingBox=null,this.boundingSphere=null;for(let Z=0;Z<Q;Z++)this.setMatrixAt(Z,r4)}computeBoundingBox(){let J=this.geometry,$=this.count;if(this.boundingBox===null)this.boundingBox=new n0;if(J.boundingBox===null)J.computeBoundingBox();this.boundingBox.makeEmpty();for(let Q=0;Q<$;Q++)this.getMatrixAt(Q,t6),g5.copy(J.boundingBox).applyMatrix4(t6),this.boundingBox.union(g5)}computeBoundingSphere(){let J=this.geometry,$=this.count;if(this.boundingSphere===null)this.boundingSphere=new Q7;if(J.boundingSphere===null)J.computeBoundingSphere();this.boundingSphere.makeEmpty();for(let Q=0;Q<$;Q++)this.getMatrixAt(Q,t6),B7.copy(J.boundingSphere).applyMatrix4(t6),this.boundingSphere.union(B7)}copy(J,$){if(super.copy(J,$),this.instanceMatrix.copy(J.instanceMatrix),J.morphTexture!==null)this.morphTexture=J.morphTexture.clone();if(J.instanceColor!==null)this.instanceColor=J.instanceColor.clone();if(this.count=J.count,J.boundingBox!==null)this.boundingBox=J.boundingBox.clone();if(J.boundingSphere!==null)this.boundingSphere=J.boundingSphere.clone();return this}getColorAt(J,$){$.fromArray(this.instanceColor.array,J*3)}getMatrixAt(J,$){$.fromArray(this.instanceMatrix.array,J*16)}getMorphAt(J,$){let Q=$.morphTargetInfluences,Z=this.morphTexture.source.data.data,W=Q.length+1,Y=J*W+1;for(let K=0;K<Q.length;K++)Q[K]=Z[Y+K]}raycast(J,$){let Q=this.matrixWorld,Z=this.count;if(M7.geometry=this.geometry,M7.material=this.material,M7.material===void 0)return;if(this.boundingSphere===null)this.computeBoundingSphere();if(B7.copy(this.boundingSphere),B7.applyMatrix4(Q),J.ray.intersectsSphere(B7)===!1)return;for(let W=0;W<Z;W++){this.getMatrixAt(W,t6),b5.multiplyMatrices(Q,t6),M7.matrixWorld=b5,M7.raycast(J,Z8);for(let Y=0,K=Z8.length;Y<K;Y++){let X=Z8[Y];X.instanceId=W,X.object=this,$.push(X)}Z8.length=0}}setColorAt(J,$){if(this.instanceColor===null)this.instanceColor=new U8(new Float32Array(this.instanceMatrix.count*3).fill(1),3);$.toArray(this.instanceColor.array,J*3)}setMatrixAt(J,$){$.toArray(this.instanceMatrix.array,J*16)}setMorphAt(J,$){let Q=$.morphTargetInfluences,Z=Q.length+1;if(this.morphTexture===null)this.morphTexture=new z$(new Float32Array(Z*this.count),Z,this.count,1028,1015);let W=this.morphTexture.source.data.data,Y=0;for(let U=0;U<Q.length;U++)Y+=Q[U];let K=this.geometry.morphTargetsRelative?1:1-Y,X=Z*J;W[X]=K,W.set(Q,X+1)}updateMorphTargets(){}dispose(){if(this.dispatchEvent({type:"dispose"}),this.morphTexture!==null)this.morphTexture.dispose(),this.morphTexture=null;return this}}class D8 extends L0{constructor(J,$,Q,Z,W,Y,K,X,U){super(J,$,Q,Z,W,Y,K,X,U);this.isCanvasTexture=!0,this.needsUpdate=!0}}class s0{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(J,$){let Q=this.getUtoTmapping(J);return this.getPoint(Q,$)}getPoints(J=5){let $=[];for(let Q=0;Q<=J;Q++)$.push(this.getPoint(Q/J));return $}getSpacedPoints(J=5){let $=[];for(let Q=0;Q<=J;Q++)$.push(this.getPointAt(Q/J));return $}getLength(){let J=this.getLengths();return J[J.length-1]}getLengths(J=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===J+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let $=[],Q,Z=this.getPoint(0),W=0;$.push(0);for(let Y=1;Y<=J;Y++)Q=this.getPoint(Y/J),W+=Q.distanceTo(Z),$.push(W),Z=Q;return this.cacheArcLengths=$,$}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(J,$){let Q=this.getLengths(),Z=0,W=Q.length,Y;if($)Y=$;else Y=J*Q[W-1];let K=0,X=W-1,U;while(K<=X)if(Z=Math.floor(K+(X-K)/2),U=Q[Z]-Y,U<0)K=Z+1;else if(U>0)X=Z-1;else{X=Z;break}if(Z=X,Q[Z]===Y)return Z/(W-1);let H=Q[Z],V=Q[Z+1]-H,q=(Y-H)/V;return(Z+q)/(W-1)}getTangent(J,$){let Z=J-0.0001,W=J+0.0001;if(Z<0)Z=0;if(W>1)W=1;let Y=this.getPoint(Z),K=this.getPoint(W),X=$||(Y.isVector2?new BJ:new A);return X.copy(K).sub(Y).normalize(),X}getTangentAt(J,$){let Q=this.getUtoTmapping(J);return this.getTangent(Q,$)}computeFrenetFrames(J,$){let Q=new A,Z=[],W=[],Y=[],K=new A,X=new Q0;for(let q=0;q<=J;q++){let D=q/J;Z[q]=this.getTangentAt(D,new A)}W[0]=new A,Y[0]=new A;let U=Number.MAX_VALUE,H=Math.abs(Z[0].x),G=Math.abs(Z[0].y),V=Math.abs(Z[0].z);if(H<=U)U=H,Q.set(1,0,0);if(G<=U)U=G,Q.set(0,1,0);if(V<=U)Q.set(0,0,1);K.crossVectors(Z[0],Q).normalize(),W[0].crossVectors(Z[0],K),Y[0].crossVectors(Z[0],W[0]);for(let q=1;q<=J;q++){if(W[q]=W[q-1].clone(),Y[q]=Y[q-1].clone(),K.crossVectors(Z[q-1],Z[q]),K.length()>Number.EPSILON){K.normalize();let D=Math.acos(B0(Z[q-1].dot(Z[q]),-1,1));W[q].applyMatrix4(X.makeRotationAxis(K,D))}Y[q].crossVectors(Z[q],W[q])}if($===!0){let q=Math.acos(B0(W[0].dot(W[J]),-1,1));if(q/=J,Z[0].dot(K.crossVectors(W[0],W[J]))>0)q=-q;for(let D=1;D<=J;D++)W[D].applyMatrix4(X.makeRotationAxis(Z[D],q*D)),Y[D].crossVectors(Z[D],W[D])}return{tangents:Z,normals:W,binormals:Y}}clone(){return new this.constructor().copy(this)}copy(J){return this.arcLengthDivisions=J.arcLengthDivisions,this}toJSON(){let J={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return J.arcLengthDivisions=this.arcLengthDivisions,J.type=this.type,J}fromJSON(J){return this.arcLengthDivisions=J.arcLengthDivisions,this}}class L9 extends s0{constructor(J=0,$=0,Q=1,Z=1,W=0,Y=Math.PI*2,K=!1,X=0){super();this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=J,this.aY=$,this.xRadius=Q,this.yRadius=Z,this.aStartAngle=W,this.aEndAngle=Y,this.aClockwise=K,this.aRotation=X}getPoint(J,$=new BJ){let Q=$,Z=Math.PI*2,W=this.aEndAngle-this.aStartAngle,Y=Math.abs(W)<Number.EPSILON;while(W<0)W+=Z;while(W>Z)W-=Z;if(W<Number.EPSILON)if(Y)W=0;else W=Z;if(this.aClockwise===!0&&!Y)if(W===Z)W=-Z;else W=W-Z;let K=this.aStartAngle+J*W,X=this.aX+this.xRadius*Math.cos(K),U=this.aY+this.yRadius*Math.sin(K);if(this.aRotation!==0){let H=Math.cos(this.aRotation),G=Math.sin(this.aRotation),V=X-this.aX,q=U-this.aY;X=V*H-q*G+this.aX,U=V*G+q*H+this.aY}return Q.set(X,U)}copy(J){return super.copy(J),this.aX=J.aX,this.aY=J.aY,this.xRadius=J.xRadius,this.yRadius=J.yRadius,this.aStartAngle=J.aStartAngle,this.aEndAngle=J.aEndAngle,this.aClockwise=J.aClockwise,this.aRotation=J.aRotation,this}toJSON(){let J=super.toJSON();return J.aX=this.aX,J.aY=this.aY,J.xRadius=this.xRadius,J.yRadius=this.yRadius,J.aStartAngle=this.aStartAngle,J.aEndAngle=this.aEndAngle,J.aClockwise=this.aClockwise,J.aRotation=this.aRotation,J}fromJSON(J){return super.fromJSON(J),this.aX=J.aX,this.aY=J.aY,this.xRadius=J.xRadius,this.yRadius=J.yRadius,this.aStartAngle=J.aStartAngle,this.aEndAngle=J.aEndAngle,this.aClockwise=J.aClockwise,this.aRotation=J.aRotation,this}}class _$ extends L9{constructor(J,$,Q,Z,W,Y){super(J,$,Q,Q,Z,W,Y);this.isArcCurve=!0,this.type="ArcCurve"}}function z9(){let J=0,$=0,Q=0,Z=0;function W(Y,K,X,U){J=Y,$=X,Q=-3*Y+3*K-2*X-U,Z=2*Y-2*K+X+U}return{initCatmullRom:function(Y,K,X,U,H){W(K,X,H*(X-Y),H*(U-K))},initNonuniformCatmullRom:function(Y,K,X,U,H,G,V){let q=(K-Y)/H-(X-Y)/(H+G)+(X-K)/G,D=(X-K)/G-(U-K)/(G+V)+(U-X)/V;q*=G,D*=G,W(K,X,q,D)},calc:function(Y){let K=Y*Y,X=K*Y;return J+$*Y+Q*K+Z*X}}}var W8=new A,J9=new z9,$9=new z9,Q9=new z9;class W7 extends s0{constructor(J=[],$=!1,Q="centripetal",Z=0.5){super();this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=J,this.closed=$,this.curveType=Q,this.tension=Z}getPoint(J,$=new A){let Q=$,Z=this.points,W=Z.length,Y=(W-(this.closed?0:1))*J,K=Math.floor(Y),X=Y-K;if(this.closed)K+=K>0?0:(Math.floor(Math.abs(K)/W)+1)*W;else if(X===0&&K===W-1)K=W-2,X=1;let U,H;if(this.closed||K>0)U=Z[(K-1)%W];else W8.subVectors(Z[0],Z[1]).add(Z[0]),U=W8;let G=Z[K%W],V=Z[(K+1)%W];if(this.closed||K+2<W)H=Z[(K+2)%W];else W8.subVectors(Z[W-1],Z[W-2]).add(Z[W-1]),H=W8;if(this.curveType==="centripetal"||this.curveType==="chordal"){let q=this.curveType==="chordal"?0.5:0.25,D=Math.pow(U.distanceToSquared(G),q),O=Math.pow(G.distanceToSquared(V),q),M=Math.pow(V.distanceToSquared(H),q);if(O<0.0001)O=1;if(D<0.0001)D=O;if(M<0.0001)M=O;J9.initNonuniformCatmullRom(U.x,G.x,V.x,H.x,D,O,M),$9.initNonuniformCatmullRom(U.y,G.y,V.y,H.y,D,O,M),Q9.initNonuniformCatmullRom(U.z,G.z,V.z,H.z,D,O,M)}else if(this.curveType==="catmullrom")J9.initCatmullRom(U.x,G.x,V.x,H.x,this.tension),$9.initCatmullRom(U.y,G.y,V.y,H.y,this.tension),Q9.initCatmullRom(U.z,G.z,V.z,H.z,this.tension);return Q.set(J9.calc(X),$9.calc(X),Q9.calc(X)),Q}copy(J){super.copy(J),this.points=[];for(let $=0,Q=J.points.length;$<Q;$++){let Z=J.points[$];this.points.push(Z.clone())}return this.closed=J.closed,this.curveType=J.curveType,this.tension=J.tension,this}toJSON(){let J=super.toJSON();J.points=[];for(let $=0,Q=this.points.length;$<Q;$++){let Z=this.points[$];J.points.push(Z.toArray())}return J.closed=this.closed,J.curveType=this.curveType,J.tension=this.tension,J}fromJSON(J){super.fromJSON(J),this.points=[];for(let $=0,Q=J.points.length;$<Q;$++){let Z=J.points[$];this.points.push(new A().fromArray(Z))}return this.closed=J.closed,this.curveType=J.curveType,this.tension=J.tension,this}}function p5(J,$,Q,Z,W){let Y=(Z-$)*0.5,K=(W-Q)*0.5,X=J*J,U=J*X;return(2*Q-2*Z+Y+K)*U+(-3*Q+3*Z-2*Y-K)*X+Y*J+Q}function t4(J,$){let Q=1-J;return Q*Q*$}function e4(J,$){return 2*(1-J)*J*$}function JK(J,$){return J*J*$}function C7(J,$,Q,Z){return t4(J,$)+e4(J,Q)+JK(J,Z)}function $K(J,$){let Q=1-J;return Q*Q*Q*$}function QK(J,$){let Q=1-J;return 3*Q*Q*J*$}function ZK(J,$){return 3*(1-J)*J*J*$}function WK(J,$){return J*J*J*$}function k7(J,$,Q,Z,W){return $K(J,$)+QK(J,Q)+ZK(J,Z)+WK(J,W)}class C$ extends s0{constructor(J=new BJ,$=new BJ,Q=new BJ,Z=new BJ){super();this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=J,this.v1=$,this.v2=Q,this.v3=Z}getPoint(J,$=new BJ){let Q=$,Z=this.v0,W=this.v1,Y=this.v2,K=this.v3;return Q.set(k7(J,Z.x,W.x,Y.x,K.x),k7(J,Z.y,W.y,Y.y,K.y)),Q}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this.v3.copy(J.v3),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J.v3=this.v3.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this.v3.fromArray(J.v3),this}}class k$ extends s0{constructor(J=new A,$=new A,Q=new A,Z=new A){super();this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=J,this.v1=$,this.v2=Q,this.v3=Z}getPoint(J,$=new A){let Q=$,Z=this.v0,W=this.v1,Y=this.v2,K=this.v3;return Q.set(k7(J,Z.x,W.x,Y.x,K.x),k7(J,Z.y,W.y,Y.y,K.y),k7(J,Z.z,W.z,Y.z,K.z)),Q}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this.v3.copy(J.v3),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J.v3=this.v3.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this.v3.fromArray(J.v3),this}}class A$ extends s0{constructor(J=new BJ,$=new BJ){super();this.isLineCurve=!0,this.type="LineCurve",this.v1=J,this.v2=$}getPoint(J,$=new BJ){let Q=$;if(J===1)Q.copy(this.v2);else Q.copy(this.v2).sub(this.v1),Q.multiplyScalar(J).add(this.v1);return Q}getPointAt(J,$){return this.getPoint(J,$)}getTangent(J,$=new BJ){return $.subVectors(this.v2,this.v1).normalize()}getTangentAt(J,$){return this.getTangent(J,$)}copy(J){return super.copy(J),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class w$ extends s0{constructor(J=new A,$=new A){super();this.isLineCurve3=!0,this.type="LineCurve3",this.v1=J,this.v2=$}getPoint(J,$=new A){let Q=$;if(J===1)Q.copy(this.v2);else Q.copy(this.v2).sub(this.v1),Q.multiplyScalar(J).add(this.v1);return Q}getPointAt(J,$){return this.getPoint(J,$)}getTangent(J,$=new A){return $.subVectors(this.v2,this.v1).normalize()}getTangentAt(J,$){return this.getTangent(J,$)}copy(J){return super.copy(J),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class I$ extends s0{constructor(J=new BJ,$=new BJ,Q=new BJ){super();this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=J,this.v1=$,this.v2=Q}getPoint(J,$=new BJ){let Q=$,Z=this.v0,W=this.v1,Y=this.v2;return Q.set(C7(J,Z.x,W.x,Y.x),C7(J,Z.y,W.y,Y.y)),Q}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class _9 extends s0{constructor(J=new A,$=new A,Q=new A){super();this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=J,this.v1=$,this.v2=Q}getPoint(J,$=new A){let Q=$,Z=this.v0,W=this.v1,Y=this.v2;return Q.set(C7(J,Z.x,W.x,Y.x),C7(J,Z.y,W.y,Y.y),C7(J,Z.z,W.z,Y.z)),Q}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class T$ extends s0{constructor(J=[]){super();this.isSplineCurve=!0,this.type="SplineCurve",this.points=J}getPoint(J,$=new BJ){let Q=$,Z=this.points,W=(Z.length-1)*J,Y=Math.floor(W),K=W-Y,X=Z[Y===0?Y:Y-1],U=Z[Y],H=Z[Y>Z.length-2?Z.length-1:Y+1],G=Z[Y>Z.length-3?Z.length-1:Y+2];return Q.set(p5(K,X.x,U.x,H.x,G.x),p5(K,X.y,U.y,H.y,G.y)),Q}copy(J){super.copy(J),this.points=[];for(let $=0,Q=J.points.length;$<Q;$++){let Z=J.points[$];this.points.push(Z.clone())}return this}toJSON(){let J=super.toJSON();J.points=[];for(let $=0,Q=this.points.length;$<Q;$++){let Z=this.points[$];J.points.push(Z.toArray())}return J}fromJSON(J){super.fromJSON(J),this.points=[];for(let $=0,Q=J.points.length;$<Q;$++){let Z=J.points[$];this.points.push(new BJ().fromArray(Z))}return this}}var YK=Object.freeze({__proto__:null,ArcCurve:_$,CatmullRomCurve3:W7,CubicBezierCurve:C$,CubicBezierCurve3:k$,EllipseCurve:L9,LineCurve:A$,LineCurve3:w$,QuadraticBezierCurve:I$,QuadraticBezierCurve3:_9,SplineCurve:T$});class R8 extends R0{constructor(J=1,$=32,Q=0,Z=Math.PI*2){super();this.type="CircleGeometry",this.parameters={radius:J,segments:$,thetaStart:Q,thetaLength:Z},$=Math.max(3,$);let W=[],Y=[],K=[],X=[],U=new A,H=new BJ;Y.push(0,0,0),K.push(0,0,1),X.push(0.5,0.5);for(let G=0,V=3;G<=$;G++,V+=3){let q=Q+G/$*Z;U.x=J*Math.cos(q),U.y=J*Math.sin(q),Y.push(U.x,U.y,U.z),K.push(0,0,1),H.x=(Y[V]/J+1)/2,H.y=(Y[V+1]/J+1)/2,X.push(H.x,H.y)}for(let G=1;G<=$;G++)W.push(G,G+1,0);this.setIndex(W),this.setAttribute("position",new eJ(Y,3)),this.setAttribute("normal",new eJ(K,3)),this.setAttribute("uv",new eJ(X,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new R8(J.radius,J.segments,J.thetaStart,J.thetaLength)}}class z0 extends R0{constructor(J=1,$=1,Q=1,Z=32,W=1,Y=!1,K=0,X=Math.PI*2){super();this.type="CylinderGeometry",this.parameters={radiusTop:J,radiusBottom:$,height:Q,radialSegments:Z,heightSegments:W,openEnded:Y,thetaStart:K,thetaLength:X};let U=this;Z=Math.floor(Z),W=Math.floor(W);let H=[],G=[],V=[],q=[],D=0,O=[],M=Q/2,F=0;if(E(),Y===!1){if(J>0)z(!0);if($>0)z(!1)}this.setIndex(H),this.setAttribute("position",new eJ(G,3)),this.setAttribute("normal",new eJ(V,3)),this.setAttribute("uv",new eJ(q,2));function E(){let N=new A,k=new A,f=0,w=($-J)/Q;for(let I=0;I<=W;I++){let x=[],L=I/W,_=L*($-J)+J;for(let P=0;P<=Z;P++){let l=P/Z,m=l*X+K,d=Math.sin(m),t=Math.cos(m);k.x=_*d,k.y=-L*Q+M,k.z=_*t,G.push(k.x,k.y,k.z),N.set(d,w,t).normalize(),V.push(N.x,N.y,N.z),q.push(l,1-L),x.push(D++)}O.push(x)}for(let I=0;I<Z;I++)for(let x=0;x<W;x++){let L=O[x][I],_=O[x+1][I],P=O[x+1][I+1],l=O[x][I+1];if(J>0||x!==0)H.push(L,_,l),f+=3;if($>0||x!==W-1)H.push(_,P,l),f+=3}U.addGroup(F,f,0),F+=f}function z(N){let k=D,f=new BJ,w=new A,I=0,x=N===!0?J:$,L=N===!0?1:-1;for(let P=1;P<=Z;P++)G.push(0,M*L,0),V.push(0,L,0),q.push(0.5,0.5),D++;let _=D;for(let P=0;P<=Z;P++){let m=P/Z*X+K,d=Math.cos(m),t=Math.sin(m);w.x=x*t,w.y=M*L,w.z=x*d,G.push(w.x,w.y,w.z),V.push(0,L,0),f.x=d*0.5+0.5,f.y=t*0.5*L+0.5,q.push(f.x,f.y),D++}for(let P=0;P<Z;P++){let l=k+P,m=_+P;if(N===!0)H.push(m,m+1,l);else H.push(m+1,m,l);I+=3}U.addGroup(F,I,N===!0?1:2),F+=I}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new z0(J.radiusTop,J.radiusBottom,J.height,J.radialSegments,J.heightSegments,J.openEnded,J.thetaStart,J.thetaLength)}}class C9 extends R0{constructor(J=[],$=[],Q=1,Z=0){super();this.type="PolyhedronGeometry",this.parameters={vertices:J,indices:$,radius:Q,detail:Z};let W=[],Y=[];if(K(Z),U(Q),H(),this.setAttribute("position",new eJ(W,3)),this.setAttribute("normal",new eJ(W.slice(),3)),this.setAttribute("uv",new eJ(Y,2)),Z===0)this.computeVertexNormals();else this.normalizeNormals();function K(E){let z=new A,N=new A,k=new A;for(let f=0;f<$.length;f+=3)q($[f+0],z),q($[f+1],N),q($[f+2],k),X(z,N,k,E)}function X(E,z,N,k){let f=k+1,w=[];for(let I=0;I<=f;I++){w[I]=[];let x=E.clone().lerp(N,I/f),L=z.clone().lerp(N,I/f),_=f-I;for(let P=0;P<=_;P++)if(P===0&&I===f)w[I][P]=x;else w[I][P]=x.clone().lerp(L,P/_)}for(let I=0;I<f;I++)for(let x=0;x<2*(f-I)-1;x++){let L=Math.floor(x/2);if(x%2===0)V(w[I][L+1]),V(w[I+1][L]),V(w[I][L]);else V(w[I][L+1]),V(w[I+1][L+1]),V(w[I+1][L])}}function U(E){let z=new A;for(let N=0;N<W.length;N+=3)z.x=W[N+0],z.y=W[N+1],z.z=W[N+2],z.normalize().multiplyScalar(E),W[N+0]=z.x,W[N+1]=z.y,W[N+2]=z.z}function H(){let E=new A;for(let z=0;z<W.length;z+=3){E.x=W[z+0],E.y=W[z+1],E.z=W[z+2];let N=M(E)/2/Math.PI+0.5,k=F(E)/Math.PI+0.5;Y.push(N,1-k)}D(),G()}function G(){for(let E=0;E<Y.length;E+=6){let z=Y[E+0],N=Y[E+2],k=Y[E+4],f=Math.max(z,N,k),w=Math.min(z,N,k);if(f>0.9&&w<0.1){if(z<0.2)Y[E+0]+=1;if(N<0.2)Y[E+2]+=1;if(k<0.2)Y[E+4]+=1}}}function V(E){W.push(E.x,E.y,E.z)}function q(E,z){let N=E*3;z.x=J[N+0],z.y=J[N+1],z.z=J[N+2]}function D(){let E=new A,z=new A,N=new A,k=new A,f=new BJ,w=new BJ,I=new BJ;for(let x=0,L=0;x<W.length;x+=9,L+=6){E.set(W[x+0],W[x+1],W[x+2]),z.set(W[x+3],W[x+4],W[x+5]),N.set(W[x+6],W[x+7],W[x+8]),f.set(Y[L+0],Y[L+1]),w.set(Y[L+2],Y[L+3]),I.set(Y[L+4],Y[L+5]),k.copy(E).add(z).add(N).divideScalar(3);let _=M(k);O(f,L+0,E,_),O(w,L+2,z,_),O(I,L+4,N,_)}}function O(E,z,N,k){if(k<0&&E.x===1)Y[z]=E.x-1;if(N.x===0&&N.z===0)Y[z]=k/2/Math.PI+0.5}function M(E){return Math.atan2(E.z,-E.x)}function F(E){return Math.atan2(-E.y,Math.sqrt(E.x*E.x+E.z*E.z))}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new C9(J.vertices,J.indices,J.radius,J.details)}}class N8 extends C9{constructor(J=1,$=0){let Q=(1+Math.sqrt(5))/2,Z=1/Q,W=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-Z,-Q,0,-Z,Q,0,Z,-Q,0,Z,Q,-Z,-Q,0,-Z,Q,0,Z,-Q,0,Z,Q,0,-Q,0,-Z,Q,0,-Z,-Q,0,Z,Q,0,Z],Y=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];super(W,Y,J,$);this.type="DodecahedronGeometry",this.parameters={radius:J,detail:$}}static fromJSON(J){return new N8(J.radius,J.detail)}}class O8 extends R0{constructor(J=0.5,$=1,Q=32,Z=1,W=0,Y=Math.PI*2){super();this.type="RingGeometry",this.parameters={innerRadius:J,outerRadius:$,thetaSegments:Q,phiSegments:Z,thetaStart:W,thetaLength:Y},Q=Math.max(3,Q),Z=Math.max(1,Z);let K=[],X=[],U=[],H=[],G=J,V=($-J)/Z,q=new A,D=new BJ;for(let O=0;O<=Z;O++){for(let M=0;M<=Q;M++){let F=W+M/Q*Y;q.x=G*Math.cos(F),q.y=G*Math.sin(F),X.push(q.x,q.y,q.z),U.push(0,0,1),D.x=(q.x/$+1)/2,D.y=(q.y/$+1)/2,H.push(D.x,D.y)}G+=V}for(let O=0;O<Z;O++){let M=O*(Q+1);for(let F=0;F<Q;F++){let E=F+M,z=E,N=E+Q+1,k=E+Q+2,f=E+1;K.push(z,N,f),K.push(N,k,f)}}this.setIndex(K),this.setAttribute("position",new eJ(X,3)),this.setAttribute("normal",new eJ(U,3)),this.setAttribute("uv",new eJ(H,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new O8(J.innerRadius,J.outerRadius,J.thetaSegments,J.phiSegments,J.thetaStart,J.thetaLength)}}class K6 extends R0{constructor(J=1,$=32,Q=16,Z=0,W=Math.PI*2,Y=0,K=Math.PI){super();this.type="SphereGeometry",this.parameters={radius:J,widthSegments:$,heightSegments:Q,phiStart:Z,phiLength:W,thetaStart:Y,thetaLength:K},$=Math.max(3,Math.floor($)),Q=Math.max(2,Math.floor(Q));let X=Math.min(Y+K,Math.PI),U=0,H=[],G=new A,V=new A,q=[],D=[],O=[],M=[];for(let F=0;F<=Q;F++){let E=[],z=F/Q,N=0;if(F===0&&Y===0)N=0.5/$;else if(F===Q&&X===Math.PI)N=-0.5/$;for(let k=0;k<=$;k++){let f=k/$;G.x=-J*Math.cos(Z+f*W)*Math.sin(Y+z*K),G.y=J*Math.cos(Y+z*K),G.z=J*Math.sin(Z+f*W)*Math.sin(Y+z*K),D.push(G.x,G.y,G.z),V.copy(G).normalize(),O.push(V.x,V.y,V.z),M.push(f+N,1-z),E.push(U++)}H.push(E)}for(let F=0;F<Q;F++)for(let E=0;E<$;E++){let z=H[F][E+1],N=H[F][E],k=H[F+1][E],f=H[F+1][E+1];if(F!==0||Y>0)q.push(z,N,f);if(F!==Q-1||X<Math.PI)q.push(N,k,f)}this.setIndex(q),this.setAttribute("position",new eJ(D,3)),this.setAttribute("normal",new eJ(O,3)),this.setAttribute("uv",new eJ(M,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new K6(J.radius,J.widthSegments,J.heightSegments,J.phiStart,J.phiLength,J.thetaStart,J.thetaLength)}}class g0 extends R0{constructor(J=1,$=0.4,Q=12,Z=48,W=Math.PI*2){super();this.type="TorusGeometry",this.parameters={radius:J,tube:$,radialSegments:Q,tubularSegments:Z,arc:W},Q=Math.floor(Q),Z=Math.floor(Z);let Y=[],K=[],X=[],U=[],H=new A,G=new A,V=new A;for(let q=0;q<=Q;q++)for(let D=0;D<=Z;D++){let O=D/Z*W,M=q/Q*Math.PI*2;G.x=(J+$*Math.cos(M))*Math.cos(O),G.y=(J+$*Math.cos(M))*Math.sin(O),G.z=$*Math.sin(M),K.push(G.x,G.y,G.z),H.x=J*Math.cos(O),H.y=J*Math.sin(O),V.subVectors(G,H).normalize(),X.push(V.x,V.y,V.z),U.push(D/Z),U.push(q/Q)}for(let q=1;q<=Q;q++)for(let D=1;D<=Z;D++){let O=(Z+1)*q+D-1,M=(Z+1)*(q-1)+D-1,F=(Z+1)*(q-1)+D,E=(Z+1)*q+D;Y.push(O,M,E),Y.push(M,F,E)}this.setIndex(Y),this.setAttribute("position",new eJ(K,3)),this.setAttribute("normal",new eJ(X,3)),this.setAttribute("uv",new eJ(U,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new g0(J.radius,J.tube,J.radialSegments,J.tubularSegments,J.arc)}}class M8 extends R0{constructor(J=new _9(new A(-1,-1,0),new A(-1,1,0),new A(1,1,0)),$=64,Q=1,Z=8,W=!1){super();this.type="TubeGeometry",this.parameters={path:J,tubularSegments:$,radius:Q,radialSegments:Z,closed:W};let Y=J.computeFrenetFrames($,W);this.tangents=Y.tangents,this.normals=Y.normals,this.binormals=Y.binormals;let K=new A,X=new A,U=new BJ,H=new A,G=[],V=[],q=[],D=[];O(),this.setIndex(D),this.setAttribute("position",new eJ(G,3)),this.setAttribute("normal",new eJ(V,3)),this.setAttribute("uv",new eJ(q,2));function O(){for(let z=0;z<$;z++)M(z);M(W===!1?$:0),E(),F()}function M(z){H=J.getPointAt(z/$,H);let N=Y.normals[z],k=Y.binormals[z];for(let f=0;f<=Z;f++){let w=f/Z*Math.PI*2,I=Math.sin(w),x=-Math.cos(w);X.x=x*N.x+I*k.x,X.y=x*N.y+I*k.y,X.z=x*N.z+I*k.z,X.normalize(),V.push(X.x,X.y,X.z),K.x=H.x+Q*X.x,K.y=H.y+Q*X.y,K.z=H.z+Q*X.z,G.push(K.x,K.y,K.z)}}function F(){for(let z=1;z<=$;z++)for(let N=1;N<=Z;N++){let k=(Z+1)*(z-1)+(N-1),f=(Z+1)*z+(N-1),w=(Z+1)*z+N,I=(Z+1)*(z-1)+N;D.push(k,f,I),D.push(f,w,I)}}function E(){for(let z=0;z<=$;z++)for(let N=0;N<=Z;N++)U.x=z/$,U.y=N/Z,q.push(U.x,U.y)}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}toJSON(){let J=super.toJSON();return J.path=this.parameters.path.toJSON(),J}static fromJSON(J){return new M8(new YK[J.path.type]().fromJSON(J.path),J.tubularSegments,J.radius,J.radialSegments,J.closed)}}class T7 extends S6{static get type(){return"MeshStandardMaterial"}constructor(J){super();this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.color=new cJ(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new cJ(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new BJ(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new c0,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.defines={STANDARD:""},this.color.copy(J.color),this.roughness=J.roughness,this.metalness=J.metalness,this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.roughnessMap=J.roughnessMap,this.metalnessMap=J.metalnessMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.envMapIntensity=J.envMapIntensity,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.flatShading=J.flatShading,this.fog=J.fog,this}}function Y8(J,$,Q){if(!J||!Q&&J.constructor===$)return J;if(typeof $.BYTES_PER_ELEMENT==="number")return new $(J);return Array.prototype.slice.call(J)}function KK(J){return ArrayBuffer.isView(J)&&!(J instanceof DataView)}class P7{constructor(J,$,Q,Z){this.parameterPositions=J,this._cachedIndex=0,this.resultBuffer=Z!==void 0?Z:new $.constructor(Q),this.sampleValues=$,this.valueSize=Q,this.settings=null,this.DefaultSettings_={}}evaluate(J){let $=this.parameterPositions,Q=this._cachedIndex,Z=$[Q],W=$[Q-1];Q:{J:{let Y;$:{Z:if(!(J<Z)){for(let K=Q+2;;){if(Z===void 0){if(J<W)break Z;return Q=$.length,this._cachedIndex=Q,this.copySampleValue_(Q-1)}if(Q===K)break;if(W=Z,Z=$[++Q],J<Z)break J}Y=$.length;break $}if(!(J>=W)){let K=$[1];if(J<K)Q=2,W=K;for(let X=Q-2;;){if(W===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(Q===X)break;if(Z=W,W=$[--Q-1],J>=W)break J}Y=Q,Q=0;break $}break Q}while(Q<Y){let K=Q+Y>>>1;if(J<$[K])Y=K;else Q=K+1}if(Z=$[Q],W=$[Q-1],W===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(Z===void 0)return Q=$.length,this._cachedIndex=Q,this.copySampleValue_(Q-1)}this._cachedIndex=Q,this.intervalChanged_(Q,W,Z)}return this.interpolate_(Q,W,J,Z)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(J){let $=this.resultBuffer,Q=this.sampleValues,Z=this.valueSize,W=J*Z;for(let Y=0;Y!==Z;++Y)$[Y]=Q[W+Y];return $}interpolate_(){throw Error("call to abstract method")}intervalChanged_(){}}class P$ extends P7{constructor(J,$,Q,Z){super(J,$,Q,Z);this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:2400,endingEnd:2400}}intervalChanged_(J,$,Q){let Z=this.parameterPositions,W=J-2,Y=J+1,K=Z[W],X=Z[Y];if(K===void 0)switch(this.getSettings_().endingStart){case 2401:W=J,K=2*$-Q;break;case 2402:W=Z.length-2,K=$+Z[W]-Z[W+1];break;default:W=J,K=Q}if(X===void 0)switch(this.getSettings_().endingEnd){case 2401:Y=J,X=2*Q-$;break;case 2402:Y=1,X=Q+Z[1]-Z[0];break;default:Y=J-1,X=$}let U=(Q-$)*0.5,H=this.valueSize;this._weightPrev=U/($-K),this._weightNext=U/(X-Q),this._offsetPrev=W*H,this._offsetNext=Y*H}interpolate_(J,$,Q,Z){let W=this.resultBuffer,Y=this.sampleValues,K=this.valueSize,X=J*K,U=X-K,H=this._offsetPrev,G=this._offsetNext,V=this._weightPrev,q=this._weightNext,D=(Q-$)/(Z-$),O=D*D,M=O*D,F=-V*M+2*V*O-V*D,E=(1+V)*M+(-1.5-2*V)*O+(-0.5+V)*D+1,z=(-1-q)*M+(1.5+q)*O+0.5*D,N=q*M-q*O;for(let k=0;k!==K;++k)W[k]=F*Y[H+k]+E*Y[U+k]+z*Y[X+k]+N*Y[G+k];return W}}class S$ extends P7{constructor(J,$,Q,Z){super(J,$,Q,Z)}interpolate_(J,$,Q,Z){let W=this.resultBuffer,Y=this.sampleValues,K=this.valueSize,X=J*K,U=X-K,H=(Q-$)/(Z-$),G=1-H;for(let V=0;V!==K;++V)W[V]=Y[U+V]*G+Y[X+V]*H;return W}}class v$ extends P7{constructor(J,$,Q,Z){super(J,$,Q,Z)}interpolate_(J){return this.copySampleValue_(J-1)}}class o0{constructor(J,$,Q,Z){if(J===void 0)throw Error("THREE.KeyframeTrack: track name is undefined");if($===void 0||$.length===0)throw Error("THREE.KeyframeTrack: no keyframes in track named "+J);this.name=J,this.times=Y8($,this.TimeBufferType),this.values=Y8(Q,this.ValueBufferType),this.setInterpolation(Z||this.DefaultInterpolation)}static toJSON(J){let $=J.constructor,Q;if($.toJSON!==this.toJSON)Q=$.toJSON(J);else{Q={name:J.name,times:Y8(J.times,Array),values:Y8(J.values,Array)};let Z=J.getInterpolation();if(Z!==J.DefaultInterpolation)Q.interpolation=Z}return Q.type=J.ValueTypeName,Q}InterpolantFactoryMethodDiscrete(J){return new v$(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodLinear(J){return new S$(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodSmooth(J){return new P$(this.times,this.values,this.getValueSize(),J)}setInterpolation(J){let $;switch(J){case 2300:$=this.InterpolantFactoryMethodDiscrete;break;case 2301:$=this.InterpolantFactoryMethodLinear;break;case 2302:$=this.InterpolantFactoryMethodSmooth;break}if($===void 0){let Q="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(J!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(Q);return console.warn("THREE.KeyframeTrack:",Q),this}return this.createInterpolant=$,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return 2300;case this.InterpolantFactoryMethodLinear:return 2301;case this.InterpolantFactoryMethodSmooth:return 2302}}getValueSize(){return this.values.length/this.times.length}shift(J){if(J!==0){let $=this.times;for(let Q=0,Z=$.length;Q!==Z;++Q)$[Q]+=J}return this}scale(J){if(J!==1){let $=this.times;for(let Q=0,Z=$.length;Q!==Z;++Q)$[Q]*=J}return this}trim(J,$){let Q=this.times,Z=Q.length,W=0,Y=Z-1;while(W!==Z&&Q[W]<J)++W;while(Y!==-1&&Q[Y]>$)--Y;if(++Y,W!==0||Y!==Z){if(W>=Y)Y=Math.max(Y,1),W=Y-1;let K=this.getValueSize();this.times=Q.slice(W,Y),this.values=this.values.slice(W*K,Y*K)}return this}validate(){let J=!0,$=this.getValueSize();if($-Math.floor($)!==0)console.error("THREE.KeyframeTrack: Invalid value size in track.",this),J=!1;let Q=this.times,Z=this.values,W=Q.length;if(W===0)console.error("THREE.KeyframeTrack: Track is empty.",this),J=!1;let Y=null;for(let K=0;K!==W;K++){let X=Q[K];if(typeof X==="number"&&isNaN(X)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,K,X),J=!1;break}if(Y!==null&&Y>X){console.error("THREE.KeyframeTrack: Out of order keys.",this,K,X,Y),J=!1;break}Y=X}if(Z!==void 0){if(KK(Z))for(let K=0,X=Z.length;K!==X;++K){let U=Z[K];if(isNaN(U)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,K,U),J=!1;break}}}return J}optimize(){let J=this.times.slice(),$=this.values.slice(),Q=this.getValueSize(),Z=this.getInterpolation()===2302,W=J.length-1,Y=1;for(let K=1;K<W;++K){let X=!1,U=J[K],H=J[K+1];if(U!==H&&(K!==1||U!==J[0]))if(!Z){let G=K*Q,V=G-Q,q=G+Q;for(let D=0;D!==Q;++D){let O=$[G+D];if(O!==$[V+D]||O!==$[q+D]){X=!0;break}}}else X=!0;if(X){if(K!==Y){J[Y]=J[K];let G=K*Q,V=Y*Q;for(let q=0;q!==Q;++q)$[V+q]=$[G+q]}++Y}}if(W>0){J[Y]=J[W];for(let K=W*Q,X=Y*Q,U=0;U!==Q;++U)$[X+U]=$[K+U];++Y}if(Y!==J.length)this.times=J.slice(0,Y),this.values=$.slice(0,Y*Q);else this.times=J,this.values=$;return this}clone(){let J=this.times.slice(),$=this.values.slice(),Z=new this.constructor(this.name,J,$);return Z.createInterpolant=this.createInterpolant,Z}}o0.prototype.TimeBufferType=Float32Array;o0.prototype.ValueBufferType=Float32Array;o0.prototype.DefaultInterpolation=2301;class Y7 extends o0{constructor(J,$,Q){super(J,$,Q)}}Y7.prototype.ValueTypeName="bool";Y7.prototype.ValueBufferType=Array;Y7.prototype.DefaultInterpolation=2300;Y7.prototype.InterpolantFactoryMethodLinear=void 0;Y7.prototype.InterpolantFactoryMethodSmooth=void 0;class j$ extends o0{}j$.prototype.ValueTypeName="color";class y$ extends o0{}y$.prototype.ValueTypeName="number";class f$ extends P7{constructor(J,$,Q,Z){super(J,$,Q,Z)}interpolate_(J,$,Q,Z){let W=this.resultBuffer,Y=this.sampleValues,K=this.valueSize,X=(Q-$)/(Z-$),U=J*K;for(let H=U+K;U!==H;U+=4)P6.slerpFlat(W,0,Y,U-K,Y,U,X);return W}}class k9 extends o0{InterpolantFactoryMethodLinear(J){return new f$(this.times,this.values,this.getValueSize(),J)}}k9.prototype.ValueTypeName="quaternion";k9.prototype.InterpolantFactoryMethodSmooth=void 0;class K7 extends o0{constructor(J,$,Q){super(J,$,Q)}}K7.prototype.ValueTypeName="string";K7.prototype.ValueBufferType=Array;K7.prototype.DefaultInterpolation=2300;K7.prototype.InterpolantFactoryMethodLinear=void 0;K7.prototype.InterpolantFactoryMethodSmooth=void 0;class h$ extends o0{}h$.prototype.ValueTypeName="vector";class x${constructor(J,$,Q){let Z=this,W=!1,Y=0,K=0,X=void 0,U=[];this.onStart=void 0,this.onLoad=J,this.onProgress=$,this.onError=Q,this.itemStart=function(H){if(K++,W===!1){if(Z.onStart!==void 0)Z.onStart(H,Y,K)}W=!0},this.itemEnd=function(H){if(Y++,Z.onProgress!==void 0)Z.onProgress(H,Y,K);if(Y===K){if(W=!1,Z.onLoad!==void 0)Z.onLoad()}},this.itemError=function(H){if(Z.onError!==void 0)Z.onError(H)},this.resolveURL=function(H){if(X)return X(H);return H},this.setURLModifier=function(H){return X=H,this},this.addHandler=function(H,G){return U.push(H,G),this},this.removeHandler=function(H){let G=U.indexOf(H);if(G!==-1)U.splice(G,2);return this},this.getHandler=function(H){for(let G=0,V=U.length;G<V;G+=2){let q=U[G],D=U[G+1];if(q.global)q.lastIndex=0;if(q.test(H))return D}return null}}}var XK=new x$;class b${constructor(J){this.manager=J!==void 0?J:XK,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(J,$){let Q=this;return new Promise(function(Z,W){Q.load(J,Z,$,W)})}parse(){}setCrossOrigin(J){return this.crossOrigin=J,this}setWithCredentials(J){return this.withCredentials=J,this}setPath(J){return this.path=J,this}setResourcePath(J){return this.resourcePath=J,this}setRequestHeader(J){return this.requestHeader=J,this}}b$.DEFAULT_MATERIAL_NAME="__DEFAULT";class B8 extends q0{constructor(J,$=1){super();this.isLight=!0,this.type="Light",this.color=new cJ(J),this.intensity=$}dispose(){}copy(J,$){return super.copy(J,$),this.color.copy(J.color),this.intensity=J.intensity,this}toJSON(J){let $=super.toJSON(J);if($.object.color=this.color.getHex(),$.object.intensity=this.intensity,this.groundColor!==void 0)$.object.groundColor=this.groundColor.getHex();if(this.distance!==void 0)$.object.distance=this.distance;if(this.angle!==void 0)$.object.angle=this.angle;if(this.decay!==void 0)$.object.decay=this.decay;if(this.penumbra!==void 0)$.object.penumbra=this.penumbra;if(this.shadow!==void 0)$.object.shadow=this.shadow.toJSON();if(this.target!==void 0)$.object.target=this.target.uuid;return $}}class A9 extends B8{constructor(J,$,Q){super(J,Q);this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(q0.DEFAULT_UP),this.updateMatrix(),this.groundColor=new cJ($)}copy(J,$){return super.copy(J,$),this.groundColor.copy(J.groundColor),this}}var Z9=new Q0,l5=new A,m5=new A;class g${constructor(J){this.camera=J,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new BJ(512,512),this.map=null,this.mapPass=null,this.matrix=new Q0,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new q8,this._frameExtents=new BJ(1,1),this._viewportCount=1,this._viewports=[new H0(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(J){let $=this.camera,Q=this.matrix;l5.setFromMatrixPosition(J.matrixWorld),$.position.copy(l5),m5.setFromMatrixPosition(J.target.matrixWorld),$.lookAt(m5),$.updateMatrixWorld(),Z9.multiplyMatrices($.projectionMatrix,$.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Z9),Q.set(0.5,0,0,0.5,0,0.5,0,0.5,0,0,0.5,0.5,0,0,0,1),Q.multiply(Z9)}getViewport(J){return this._viewports[J]}getFrameExtents(){return this._frameExtents}dispose(){if(this.map)this.map.dispose();if(this.mapPass)this.mapPass.dispose()}copy(J){return this.camera=J.camera.clone(),this.intensity=J.intensity,this.bias=J.bias,this.radius=J.radius,this.mapSize.copy(J.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let J={};if(this.intensity!==1)J.intensity=this.intensity;if(this.bias!==0)J.bias=this.bias;if(this.normalBias!==0)J.normalBias=this.normalBias;if(this.radius!==1)J.radius=this.radius;if(this.mapSize.x!==512||this.mapSize.y!==512)J.mapSize=this.mapSize.toArray();return J.camera=this.camera.toJSON(!1).object,delete J.camera.matrix,J}}class p$ extends g${constructor(){super(new w7(-5,5,5,-5,0.5,500));this.isDirectionalLightShadow=!0}}class L8 extends B8{constructor(J,$){super(J,$);this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(q0.DEFAULT_UP),this.updateMatrix(),this.target=new q0,this.shadow=new p$}dispose(){this.shadow.dispose()}copy(J){return super.copy(J),this.target=J.target.clone(),this.shadow=J.shadow.clone(),this}}class w9 extends B8{constructor(J,$){super(J,$);this.isAmbientLight=!0,this.type="AmbientLight"}}class I9{constructor(J=!0){this.autoStart=J,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=u5(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let J=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let $=u5();J=($-this.oldTime)/1000,this.oldTime=$,this.elapsedTime+=J}return J}}function u5(){return performance.now()}var T9="\\[\\]\\.:\\/",UK=new RegExp("["+T9+"]","g"),P9="[^"+T9+"]",HK="[^"+T9.replace("\\.","")+"]",GK=/((?:WC+[\/:])*)/.source.replace("WC",P9),qK=/(WCOD+)?/.source.replace("WCOD",HK),VK=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",P9),EK=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",P9),FK=new RegExp("^"+GK+qK+VK+EK+"$"),DK=["material","materials","bones","map"];class l${constructor(J,$,Q){let Z=Q||$0.parseTrackName($);this._targetGroup=J,this._bindings=J.subscribe_($,Z)}getValue(J,$){this.bind();let Q=this._targetGroup.nCachedObjects_,Z=this._bindings[Q];if(Z!==void 0)Z.getValue(J,$)}setValue(J,$){let Q=this._bindings;for(let Z=this._targetGroup.nCachedObjects_,W=Q.length;Z!==W;++Z)Q[Z].setValue(J,$)}bind(){let J=this._bindings;for(let $=this._targetGroup.nCachedObjects_,Q=J.length;$!==Q;++$)J[$].bind()}unbind(){let J=this._bindings;for(let $=this._targetGroup.nCachedObjects_,Q=J.length;$!==Q;++$)J[$].unbind()}}class $0{constructor(J,$,Q){this.path=$,this.parsedPath=Q||$0.parseTrackName($),this.node=$0.findNode(J,this.parsedPath.nodeName),this.rootNode=J,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(J,$,Q){if(!(J&&J.isAnimationObjectGroup))return new $0(J,$,Q);else return new $0.Composite(J,$,Q)}static sanitizeNodeName(J){return J.replace(/\s/g,"_").replace(UK,"")}static parseTrackName(J){let $=FK.exec(J);if($===null)throw Error("PropertyBinding: Cannot parse trackName: "+J);let Q={nodeName:$[2],objectName:$[3],objectIndex:$[4],propertyName:$[5],propertyIndex:$[6]},Z=Q.nodeName&&Q.nodeName.lastIndexOf(".");if(Z!==void 0&&Z!==-1){let W=Q.nodeName.substring(Z+1);if(DK.indexOf(W)!==-1)Q.nodeName=Q.nodeName.substring(0,Z),Q.objectName=W}if(Q.propertyName===null||Q.propertyName.length===0)throw Error("PropertyBinding: can not parse propertyName from trackName: "+J);return Q}static findNode(J,$){if($===void 0||$===""||$==="."||$===-1||$===J.name||$===J.uuid)return J;if(J.skeleton){let Q=J.skeleton.getBoneByName($);if(Q!==void 0)return Q}if(J.children){let Q=function(W){for(let Y=0;Y<W.length;Y++){let K=W[Y];if(K.name===$||K.uuid===$)return K;let X=Q(K.children);if(X)return X}return null},Z=Q(J.children);if(Z)return Z}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(J,$){J[$]=this.targetObject[this.propertyName]}_getValue_array(J,$){let Q=this.resolvedProperty;for(let Z=0,W=Q.length;Z!==W;++Z)J[$++]=Q[Z]}_getValue_arrayElement(J,$){J[$]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(J,$){this.resolvedProperty.toArray(J,$)}_setValue_direct(J,$){this.targetObject[this.propertyName]=J[$]}_setValue_direct_setNeedsUpdate(J,$){this.targetObject[this.propertyName]=J[$],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(J,$){this.targetObject[this.propertyName]=J[$],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(J,$){let Q=this.resolvedProperty;for(let Z=0,W=Q.length;Z!==W;++Z)Q[Z]=J[$++]}_setValue_array_setNeedsUpdate(J,$){let Q=this.resolvedProperty;for(let Z=0,W=Q.length;Z!==W;++Z)Q[Z]=J[$++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(J,$){let Q=this.resolvedProperty;for(let Z=0,W=Q.length;Z!==W;++Z)Q[Z]=J[$++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(J,$){this.resolvedProperty[this.propertyIndex]=J[$]}_setValue_arrayElement_setNeedsUpdate(J,$){this.resolvedProperty[this.propertyIndex]=J[$],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(J,$){this.resolvedProperty[this.propertyIndex]=J[$],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(J,$){this.resolvedProperty.fromArray(J,$)}_setValue_fromArray_setNeedsUpdate(J,$){this.resolvedProperty.fromArray(J,$),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(J,$){this.resolvedProperty.fromArray(J,$),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(J,$){this.bind(),this.getValue(J,$)}_setValue_unbound(J,$){this.bind(),this.setValue(J,$)}bind(){let J=this.node,$=this.parsedPath,Q=$.objectName,Z=$.propertyName,W=$.propertyIndex;if(!J)J=$0.findNode(this.rootNode,$.nodeName),this.node=J;if(this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!J){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(Q){let U=$.objectIndex;switch(Q){case"materials":if(!J.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}J=J.material.materials;break;case"bones":if(!J.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}J=J.skeleton.bones;for(let H=0;H<J.length;H++)if(J[H].name===U){U=H;break}break;case"map":if("map"in J){J=J.map;break}if(!J.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}J=J.material.map;break;default:if(J[Q]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}J=J[Q]}if(U!==void 0){if(J[U]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,J);return}J=J[U]}}let Y=J[Z];if(Y===void 0){let U=$.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+U+"."+Z+" but it wasn't found.",J);return}let K=this.Versioning.None;if(this.targetObject=J,J.needsUpdate!==void 0)K=this.Versioning.NeedsUpdate;else if(J.matrixWorldNeedsUpdate!==void 0)K=this.Versioning.MatrixWorldNeedsUpdate;let X=this.BindingType.Direct;if(W!==void 0){if(Z==="morphTargetInfluences"){if(!J.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!J.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}if(J.morphTargetDictionary[W]!==void 0)W=J.morphTargetDictionary[W]}X=this.BindingType.ArrayElement,this.resolvedProperty=Y,this.propertyIndex=W}else if(Y.fromArray!==void 0&&Y.toArray!==void 0)X=this.BindingType.HasFromToArray,this.resolvedProperty=Y;else if(Array.isArray(Y))X=this.BindingType.EntireArray,this.resolvedProperty=Y;else this.propertyName=Z;this.getValue=this.GetterByBindingType[X],this.setValue=this.SetterByBindingTypeAndVersioning[X][K]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}$0.Composite=l$;$0.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};$0.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};$0.prototype.GetterByBindingType=[$0.prototype._getValue_direct,$0.prototype._getValue_array,$0.prototype._getValue_arrayElement,$0.prototype._getValue_toArray];$0.prototype.SetterByBindingTypeAndVersioning=[[$0.prototype._setValue_direct,$0.prototype._setValue_direct_setNeedsUpdate,$0.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[$0.prototype._setValue_array,$0.prototype._setValue_array_setNeedsUpdate,$0.prototype._setValue_array_setMatrixWorldNeedsUpdate],[$0.prototype._setValue_arrayElement,$0.prototype._setValue_arrayElement_setNeedsUpdate,$0.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[$0.prototype._setValue_fromArray,$0.prototype._setValue_fromArray_setNeedsUpdate,$0.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var CK=new Float32Array(1);var d5=new Q0;class S9{constructor(J,$,Q=0,Z=1/0){this.ray=new G9(J,$),this.near=Q,this.far=Z,this.camera=null,this.layers=new G8,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(J,$){this.ray.set(J,$)}setFromCamera(J,$){if($.isPerspectiveCamera)this.ray.origin.setFromMatrixPosition($.matrixWorld),this.ray.direction.set(J.x,J.y,0.5).unproject($).sub(this.ray.origin).normalize(),this.camera=$;else if($.isOrthographicCamera)this.ray.origin.set(J.x,J.y,($.near+$.far)/($.near-$.far)).unproject($),this.ray.direction.set(0,0,-1).transformDirection($.matrixWorld),this.camera=$;else console.error("THREE.Raycaster: Unsupported camera type: "+$.type)}setFromXRController(J){return d5.identity().extractRotation(J.matrixWorld),this.ray.origin.setFromMatrixPosition(J.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(d5),this}intersectObject(J,$=!0,Q=[]){return X9(J,this,Q,$),Q.sort(c5),Q}intersectObjects(J,$=!0,Q=[]){for(let Z=0,W=J.length;Z<W;Z++)X9(J[Z],this,Q,$);return Q.sort(c5),Q}}function c5(J,$){return J.distance-$.distance}function X9(J,$,Q,Z){let W=!0;if(J.layers.test($.layers)){if(J.raycast($,Q)===!1)W=!1}if(W===!0&&Z===!0){let Y=J.children;for(let K=0,X=Y.length;K<X;K++)X9(Y[K],$,Q,!0)}}if(typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"170"}}));if(typeof window<"u")if(window.__THREE__)console.warn("WARNING: Multiple instances of Three.js being imported.");else window.__THREE__="170";function u$(J,$=!1){let Q=J[0].index!==null,Z=new Set(Object.keys(J[0].attributes)),W=new Set(Object.keys(J[0].morphAttributes)),Y={},K={},X=J[0].morphTargetsRelative,U=new R0,H=0;for(let G=0;G<J.length;++G){let V=J[G],q=0;if(Q!==(V.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+G+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(let D in V.attributes){if(!Z.has(D))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+G+'. All geometries must have compatible attributes; make sure "'+D+'" attribute exists among all geometries, or in none of them.'),null;if(Y[D]===void 0)Y[D]=[];Y[D].push(V.attributes[D]),q++}if(q!==Z.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+G+". Make sure all geometries have the same number of attributes."),null;if(X!==V.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+G+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(let D in V.morphAttributes){if(!W.has(D))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+G+".  .morphAttributes must be consistent throughout all geometries."),null;if(K[D]===void 0)K[D]=[];K[D].push(V.morphAttributes[D])}if($){let D;if(Q)D=V.index.count;else if(V.attributes.position!==void 0)D=V.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+G+". The geometry must have either an index or a position attribute"),null;U.addGroup(H,D,G),H+=D}}if(Q){let G=0,V=[];for(let q=0;q<J.length;++q){let D=J[q].index;for(let O=0;O<D.count;++O)V.push(D.getX(O)+G);G+=J[q].attributes.position.count}U.setIndex(V)}for(let G in Y){let V=m$(Y[G]);if(!V)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+G+" attribute."),null;U.setAttribute(G,V)}for(let G in K){let V=K[G][0].length;if(V===0)break;U.morphAttributes=U.morphAttributes||{},U.morphAttributes[G]=[];for(let q=0;q<V;++q){let D=[];for(let M=0;M<K[G].length;++M)D.push(K[G][M][q]);let O=m$(D);if(!O)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+G+" morphAttribute."),null;U.morphAttributes[G].push(O)}}return U}function m$(J){let $,Q,Z,W=-1,Y=0;for(let H=0;H<J.length;++H){let G=J[H];if($===void 0)$=G.array.constructor;if($!==G.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(Q===void 0)Q=G.itemSize;if(Q!==G.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(Z===void 0)Z=G.normalized;if(Z!==G.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(W===-1)W=G.gpuType;if(W!==G.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;Y+=G.count*Q}let K=new $(Y),X=new k0(K,Q,Z),U=0;for(let H=0;H<J.length;++H){let G=J[H];if(G.isInterleavedBufferAttribute){let V=U/Q;for(let q=0,D=G.count;q<D;q++)for(let O=0;O<Q;O++){let M=G.getComponent(q,O);X.setComponent(q+V,O,M)}}else K.set(G.array,U);U+=G.count*Q}if(W!==void 0)X.gpuType=W;return X}var n={sky:12175058,grass:8229992,grassDark:6979672,concrete:10133928,concreteDark:8357517,kerb:11910339,asphalt:4936282,gravel:9211794,pipe:5008006,pipeDark:3888493,flange:3095367,steel:11844804,steelDark:8160912,gunmetal:4015696,navy:2244714,wall:14146012,wallDark:12172996,roof:5857385,glass:10274024,door:2896956,van:15790836,vanTrim:2244714,tyre:1843236,water:3779048,waterGlow:7327999,red:14174011,amber:15180347,green:3781499,grey:9148065,gold:14266943,dirt:7230008,trench:3023897,barrier:14715439,smoke:14673128},z8={red:n.red,amber:n.amber,green:n.green,grey:n.grey},X7=new A(58,57,58),f9=new Map;function j6(J,$,Q,Z=1){let W=f9.get(J);if(W)return W;let Y=document.createElement("canvas");Y.width=Y.height=$;let K=Y.getContext("2d");Q(K,$);let X=new D8(Y);return X.wrapS=X.wrapT=r5,X.repeat.set(Z,Z),X.colorSpace=H8,X.anisotropy=8,f9.set(J,X),X}function H7(J,$,Q,Z){J.fillStyle=Q,J.fillRect(0,0,$,$);let W=J.getImageData(0,0,$,$),Y=W.data;for(let K=0;K<Y.length;K+=4){let X=(Math.random()-0.5)*Z;Y[K]+=X,Y[K+1]+=X,Y[K+2]+=X}J.putImageData(W,0,0)}var X6=()=>j6("concrete",256,(J,$)=>{H7(J,$,"#e2e5e8",26),J.strokeStyle="rgba(0,0,0,0.18)",J.lineWidth=2,J.strokeRect(1,1,$-2,$-2)},8),NK=()=>j6("grass",256,(J,$)=>{H7(J,$,"#dfe6d8",34);for(let Q=0;Q<400;Q++)J.fillStyle=`rgba(0,0,0,${Math.random()*0.08})`,J.fillRect(Math.random()*$,Math.random()*$,2,3)},72),OK=()=>j6("asphalt",256,(J,$)=>H7(J,$,"#d8dbde",30),10),MK=()=>j6("steel",128,(J,$)=>{H7(J,$,"#e6e9ec",14);for(let Q=0;Q<$;Q+=3)J.fillStyle=`rgba(255,255,255,${Math.random()*0.07})`,J.fillRect(Q,0,1,$)},2),BK=()=>j6("paint",128,(J,$)=>{H7(J,$,"#e8eaec",10);for(let Q=0;Q<40;Q++)J.fillStyle=`rgba(0,0,0,${Math.random()*0.06})`,J.fillRect(Math.random()*$,Math.random()*$,6,2)},3),_8=()=>j6("roof",128,(J,$)=>{H7(J,$,"#e0e3e6",12);for(let Q=0;Q<$;Q+=16)J.fillStyle="rgba(0,0,0,0.28)",J.fillRect(Q,0,2,$),J.fillStyle="rgba(255,255,255,0.08)",J.fillRect(Q+8,0,1,$)},3),x9=(J,$)=>j6(J,128,(Q,Z)=>{let W=Q.createRadialGradient(Z/2,Z/2,0,Z/2,Z/2,Z/2);$.forEach(([Y,K])=>W.addColorStop(Y,K)),Q.fillStyle=W,Q.fillRect(0,0,Z,Z)}),v9=()=>x9("glow",[[0,"rgba(255,255,255,0.95)"],[0.35,"rgba(255,255,255,0.3)"],[1,"rgba(255,255,255,0)"]]),LK=()=>x9("drop",[[0,"rgba(220,240,255,0.95)"],[0.5,"rgba(120,190,240,0.5)"],[1,"rgba(120,190,240,0)"]]),d$=()=>x9("steam",[[0,"rgba(255,255,255,0.55)"],[1,"rgba(255,255,255,0)"]]);function U6(J,$){let Z=document.createElement("canvas");Z.width=Math.round($.w*28),Z.height=Math.round($.h*28);let W=Z.getContext("2d");W.fillStyle=$.bg??"#101418",W.fillRect(0,0,Z.width,Z.height),W.strokeStyle="rgba(255,255,255,0.15)",W.lineWidth=2,W.strokeRect(1,1,Z.width-2,Z.height-2),W.fillStyle=$.color??"#8fdcff",W.textAlign="center",W.textBaseline="middle";let Y=($.font??$.h*0.5)*28;W.font=`600 ${Y}px ${$.mono?"ui-monospace, Menlo, monospace":"-apple-system, Inter, Helvetica, Arial, sans-serif"}`;let K=J.split(`
`);K.forEach((U,H)=>W.fillText(U,Z.width/2,Z.height/2+(H-(K.length-1)/2)*Y*1.2));let X=new D8(Z);return X.colorSpace=H8,X.anisotropy=8,new TJ(new Y6($.w,$.h),new W6({map:X,toneMapped:!1}))}var c$=new Map,h9=new Set,i$=(J,$)=>{let Q=c$.get(J);if(!Q)Q=$(),c$.set(J,Q),h9.add(Q);return Q},N0=(J,$={})=>{let{map:Q,...Z}=$;return i$(`s|${J}|${Q?Q.uuid:""}|${JSON.stringify(Z)}`,()=>new T7({color:J,roughness:0.7,metalness:0.12,...$}))},p0=(J)=>N0(J,{roughness:0.45,metalness:0.35,map:BK()}),U7=(J=n.steel)=>N0(J,{roughness:0.38,metalness:0.8,map:MK()}),v6=(J,$=1.6)=>i$(`e|${J}|${$}`,()=>new T7({color:J,emissive:J,emissiveIntensity:$,roughness:0.4,metalness:0})),zK=(J,$)=>new T7({color:J,emissive:J,emissiveIntensity:$,roughness:0.4,metalness:0}),n$=new W6({color:7327999,transparent:!0,opacity:0.9,toneMapped:!1}),j9=new I7({map:null,color:16777215,transparent:!0,opacity:0.9,depthWrite:!1}),s$=new W6,o$={red:0,amber:1,green:2,grey:3},S7=(J,$,Q,Z=!1)=>new F8(new I7({map:J,color:$,transparent:!0,opacity:Q,depthWrite:!1,blending:Z?i5:o5}));function _K(J){let $=J.replace(/^hair transplant\s*/i,"").replace(/\s+[-–—]\s+/g," · ").trim()||J;return $.length>26?$.slice(0,25).trimEnd()+"…":$}class b9{renderer;scene=new O9;camera;container;opts;raf=0;clock=new I9;world=new Z0;scenery=new Z0;fx=new Z0;pickables=[];flows=[];fills=[];tankFills=new Map;tankPanels=new Map;leaks=[];beacons=[];steams=[];spins=[];halos=[];digs=[];vans=new Map;trips=[];puffs=[];tankPos=new Map;roadZ=40;clinicRoadX=0;labelAnchors=[];hovered=null;sun;raycaster=new S9;pointer=new BJ(-2,-2);disposed=!1;zoom=1;zoomTarget=1;baseFs=60;center=new A;proxies=new Z0;flowMeshes=[];fitPts=[];focusTarget=null;townSig="";labelsDirty=!0;pointerDirty=!0;shadowHold=0;dummy=new q0;ro=null;slowT=0;slowN=0;settle=0;constructor(J,$={}){this.container=J,this.opts=$,this.renderer=new N9({antialias:!0,alpha:!1,powerPreference:"high-performance"}),this.renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1)),this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=n5,this.renderer.toneMapping=a5,this.renderer.toneMappingExposure=1.1,this.renderer.outputColorSpace=H8,J.appendChild(this.renderer.domElement),Object.assign(this.renderer.domElement.style,{display:"block",width:"100%",height:"100%"}),this.renderer.shadowMap.autoUpdate=!1,this.camera=new w7(-1,1,1,-1,-400,800),this.camera.position.copy(X7),this.camera.lookAt(0,0,0),this.scene.background=new cJ(n.sky),this.scene.fog=new E8(n.sky,320,620),this.scene.add(new A9(14674677,5597514,1.15)),this.scene.add(new w9(16777215,0.35)),this.sun=new L8(16773597,2.4),this.sun.position.set(70,100,30),this.sun.castShadow=!0,this.sun.shadow.mapSize.set(4096,4096),Object.assign(this.sun.shadow.camera,{left:-230,right:230,top:230,bottom:-230,near:1,far:500}),this.sun.shadow.bias=-0.0004,this.sun.shadow.normalBias=0.03,this.sun.shadow.radius=3,this.scene.add(this.sun);let Q=new L8(12572415,0.5);if(Q.position.set(-60,40,-80),this.scene.add(Q),this.scene.add(this.world,this.scenery,this.fx,this.proxies),this.buildGround(),this.renderer.domElement.addEventListener("pointermove",this.onMove),this.renderer.domElement.addEventListener("click",this.onClick),typeof ResizeObserver<"u")this.ro=new ResizeObserver(this.refit),this.ro.observe(J);else window.addEventListener("resize",this.refit);this.resize(),this.loop()}setTown(J){let $=JSON.stringify(J);if($===this.townSig)return;this.clearTown(),this.townSig=$,this.setNight(J.hour<7||J.hour>=19);let Q=this.world,Z=(T)=>T===null?"—":`$${Math.round(T).toLocaleString()}`,W=(T,jJ)=>T?"Weak":jJ?"Strong":"Steady",Y=J.towers.length>6?3:2,K=Math.max(1,Math.ceil(J.towers.length/Y)),X={x:-118-(Y-2)*26,z:-44,w:22+Y*26,d:Math.max(88,18+K*28)};this.plinth(X.x,X.z,X.w,X.d,"ACQUISITION PLANT",25);let U=X.x+X.w-6,H=X.z+8,G=X.z+X.d-8;this.pipe([[U,2,H],[U,2,G]],1.3);let V=Math.max(1,J.towers.reduce((T,jJ)=>T+jJ.leads,0));J.towers.forEach((T,jJ)=>{let OJ=jJ%Y,LJ=Math.floor(jJ/Y),zJ=X.x+14+OJ*26,S=X.z+16+LJ*28,GJ=new Z0;GJ.position.set(zJ,0.6,S);let yJ=9,AJ=4.6,YJ=6;for(let[FJ,KJ]of[[-2.8,-2.8],[2.8,-2.8],[-2.8,2.8],[2.8,2.8]])GJ.add(this.box(0.55,yJ,0.55,n.gunmetal,FJ,0,KJ,{metalness:0.6,roughness:0.5}));for(let FJ of[3,6.5])GJ.add(this.box(6.2,0.3,0.3,n.gunmetal,0,FJ,-2.8)),GJ.add(this.box(6.2,0.3,0.3,n.gunmetal,0,FJ,2.8)),GJ.add(this.box(0.3,0.3,6.2,n.gunmetal,-2.8,FJ,0)),GJ.add(this.box(0.3,0.3,6.2,n.gunmetal,2.8,FJ,0));GJ.add(this.cyl(AJ+0.4,0.5,n.gunmetal,0,yJ,0));let sJ=new TJ(new z0(AJ,AJ,YJ,40),p0(n.navy));sJ.position.y=yJ+0.5+YJ/2,sJ.castShadow=!0,GJ.add(sJ);for(let FJ of[0.2,0.8])GJ.add(this.ring(AJ+0.06,0.12,n.steel,0,yJ+0.5+YJ*FJ,0));let DJ=new TJ(new K6(AJ,40,12,0,Math.PI*2,0,Math.PI/2),U7(n.steelDark));DJ.scale.y=0.4,DJ.position.y=yJ+0.5+YJ,DJ.castShadow=!0,GJ.add(DJ),GJ.add(this.ring(AJ+1,0.1,n.gunmetal,0,yJ+1.4,0));for(let FJ=0;FJ<14;FJ++){let KJ=FJ/14*Math.PI*2;GJ.add(this.box(0.07,1,0.07,n.gunmetal,Math.cos(KJ)*(AJ+1),yJ+0.5,Math.sin(KJ)*(AJ+1)))}GJ.add(this.box(0.7,YJ-0.8,0.4,n.gunmetal,-AJ*0.7,yJ+0.9,AJ*0.7));let wJ=new TJ(new w0(0.4,0.01,0.2),v6(n.waterGlow,1.6));wJ.position.set(-AJ*0.7,yJ+1.1,AJ*0.7+0.2),wJ.userData.dyn=!0,GJ.add(wJ),this.fills.push({water:wJ,target:Math.max(0.05,T.fill),maxH:YJ-1.2,base:yJ+1.1}),GJ.add(this.box(7,0.5,4,n.concreteDark,5.5,0,5.5,{map:X6()}));let C=new TJ(new z0(1.1,1.1,3.2,24),p0(n.pipe));C.rotation.z=Math.PI/2,C.position.set(4.6,1.6,5.5),C.castShadow=!0,GJ.add(C);let R=new TJ(new z0(0.9,0.9,2.2,24),p0(3817285));R.rotation.z=Math.PI/2,R.position.set(7.3,1.6,5.5),GJ.add(R);let h=new TJ(new g0(0.55,0.12,6,18),U7());if(h.rotation.y=Math.PI/2,h.position.set(8.5,1.6,5.5),GJ.add(h),!T.fire&&T.leads>0)h.userData.dyn=!0,this.spins.push({mesh:h,speed:T.star?14:6});GJ.add(this.gauge(4.6,3.4,5.5,T.fire?"red":T.star?"green":"grey")),GJ.add(this.valve(8.6,2,3.2,!T.fire&&T.leads===0)),GJ.add(this.cyl(0.55,yJ-1,n.pipe,0,0.5,AJ+0.3)),this.pipe([[zJ,2,S+AJ+0.3],[zJ,2,S+5.5],[zJ+4.6,2,S+5.5]],0.55,!1);let s=this.pipe([[zJ+10,2,S+5.5],[U-4,2,S+5.5],[U,2,S+5.5]],0.8);this.valveOnPipe(zJ+12.5,2,S+5.5,0.8);let a=T.leads/V,c=T.fire?1:Math.max(1,Math.round(a*10));for(let FJ=0;FJ<c;FJ++)this.addFlow(s,FJ/c,T.star?0.32:T.fire?0.05:0.16,0.8);if(GJ.add(this.light(0,yJ+0.5+YJ+2.4,0,z8[T.tone],T.tone!=="grey")),T.fire)this.addLeak(new A(zJ+12.5,2,S+5.5),new A(0,-1,0.6)),this.addBeacon(new A(zJ+5.5,2.9,S+3.6),n.red);if(T.star)this.addHalo(new A(zJ,0.62,S),AJ+2.6);this.tag(GJ,{kind:"tower",id:T.id}),Q.add(GJ),this.labelAnchors.push({key:`tower:${T.id}`,pos:new A(zJ,yJ+YJ+4.6+LJ%2*3,S),short:_K(T.name),title:T.name,tone:T.tone,kind:"tower",kpis:[["Leads",String(T.leads)],["CPL",Z(T.costPerLead)],["Bookings",String(T.booked)],["Cost / showed",Z(T.costPerShow)],["Trend",T.costTrend===null?"n/a":`${T.costTrend>=1?"+":"−"}${Math.round(Math.abs(T.costTrend-1)*100)}% CPL`],["Performance",W(T.fire,T.star)]]})});let q={x:X.x+X.w+16,z:-44,w:22+Math.max(1,J.bays.length)*20,d:88},D=X.z+X.d/2,O=new A(X.x+X.w+10,0.6,D),M=this.pipe([[U,2,D],[O.x-6,2,D]],1.3),F=this.pipe([[O.x+6,2,D],[q.x-4,2,D],[q.x-4,2,q.z+14],[q.x+6,2,q.z+14]],1.3),E=Math.max(2,Math.min(14,Math.round(V/8)));for(let T=0;T<E;T++)this.addFlow(M,T/E,0.25,1.3),this.addFlow(F,T/E,0.12,1.3);let z=new Z0;z.position.copy(O),z.add(this.box(12,0.6,10,n.concreteDark,0,0,0,{map:X6()}));let N=new TJ(new z0(2.2,2.2,8,28),p0(n.pipe));N.rotation.z=Math.PI/2,N.position.set(0,2.6,0),N.castShadow=!0,z.add(N),z.add(this.ring(2.35,0.2,n.flange,-3.2,2.6,0,!0)),z.add(this.ring(2.35,0.2,n.flange,3.2,2.6,0,!0));let k=new TJ(new z0(1.6,1.6,3,24),p0(3817285));k.rotation.x=Math.PI/2,k.position.set(0,2.6,5),z.add(k);let f=new TJ(new g0(1,0.18,6,18),U7());if(f.position.set(0,2.6,6.6),z.add(f),!J.pump.fire)f.userData.dyn=!0,this.spins.push({mesh:f,speed:8});if(z.add(this.gauge(-3.8,5.2,3.2,J.pump.fire?"red":"green")),z.add(this.box(0.4,4,0.4,n.gunmetal,4.5,0.6,-3.5)),z.add(this.light(4.5,5,-3.5,J.pump.fire?n.red:n.green,!0)),this.tag(z,{kind:"pump",id:"pump"}),Q.add(z),J.pump.fire)this.addBeacon(new A(O.x,5.4,O.z-3),n.red),this.addSteam(new A(O.x+3.4,4.6,O.z));this.labelAnchors.push({key:"pump:pump",pos:new A(O.x,9,O.z),short:"Main pump",title:"Main pump · automations",tone:J.pump.fire?"red":"grey",kind:"pump",kpis:J.pump.issues.length?J.pump.issues.map((T,jJ)=>[`Issue ${jJ+1}`,T]):[["Leads webhook","Flowing"],["Reminder texts","Sending"]]}),this.plinth(q.x,q.z,q.w,q.d,"ADVISOR DEPOT",16);let w=Math.max(1,J.bays.length),I=q.w-12,x=20,L=q.x+q.w/2,_=q.z+12,P=new Z0;P.position.set(L,0.6,_),P.add(this.box(I,10,x,n.wall,0,0,0,{map:X6(),roughness:0.85})),P.add(this.box(I+1,0.7,x+1,n.roof,0,10,0,{map:_8(),metalness:0.4,roughness:0.5}));for(let T=0;T<Math.floor(I/9);T++)P.add(this.box(5,0.5,4,n.glass,-I/2+6+T*9,10.7,-2,{transparent:!0,opacity:0.6,roughness:0.1,metalness:0.3}));P.add(this.box(I+1,1.6,0.5,n.navy,0,8,x/2+0.3));let l=U6("ADVISOR DEPOT · WAREHOUSE",{w:16,h:1.3,font:0.8,color:"#eef2f6",bg:"#22406a"});l.position.set(0,8.8,x/2+0.6),P.add(l),J.bays.forEach((T,jJ)=>{let OJ=-I/2+10+jJ*20;P.add(this.box(8,6.5,0.4,n.door,OJ,0,x/2+0.05));for(let LJ=1;LJ<7;LJ++)P.add(this.box(8,0.06,0.12,n.steelDark,OJ,LJ,x/2+0.3));P.add(this.light(OJ,7.2,x/2+0.4,T.inSession?n.green:n.grey,T.inSession))}),this.tag(P,{kind:"depot",id:"depot"}),Q.add(P),this.labelAnchors.push({key:"depot",pos:new A(L,14,_-4),short:"Depot warehouse",title:"Advisor depot",tone:"grey",kind:"depot",kpis:[["Leads in the yard",J.yardLeads.toLocaleString()],["Advisors online",String(J.bays.filter((T)=>T.inSession).length)],["Booked today",String(J.todayBooked)],["Showed today",String(J.todayShowed)]]});let m=_+x/2+4;this.pipe([[q.x+6,2,q.z+14],[q.x+6,2,m],[q.x+q.w-6,2,m]],1.1);let d=m+26;this.roadZ=q.z+q.d+10;let t=this.pipe([[q.x+6,2,d],[q.x+q.w-4,2,d]],1.1);J.bays.forEach((T,jJ)=>{let OJ=L-I/2+10+jJ*20,LJ=m+12,zJ=new Z0;zJ.position.set(OJ,0.6,LJ),zJ.add(this.box(12,0.6,9,n.concreteDark,0,0,0,{map:X6()}));for(let C of[-2.6,2.6]){let R=new TJ(new z0(1.2,1.2,4.2,24),p0(n.pipe));R.rotation.x=Math.PI/2,R.position.set(C,1.9,0),R.castShadow=!0,zJ.add(R);let h=new TJ(new z0(0.9,0.9,2,20),p0(3817285));h.rotation.x=Math.PI/2,h.position.set(C,1.9,3.2),zJ.add(h);let s=new TJ(new g0(0.5,0.1,6,16),U7());if(s.position.set(C,1.9,4.3),zJ.add(s),T.inSession)s.userData.dyn=!0,this.spins.push({mesh:s,speed:T.star?16:T.fire?3:8})}zJ.add(this.box(1.2,4.5,2.2,3817285,5,0.6,-2.4,{metalness:0.5,roughness:0.4})),zJ.add(this.gauge(5,3.6,-1.25,T.fire?"red":T.star?"green":T.inSession?"grey":"grey")),zJ.add(this.light(5,5.6,-2.4,z8[T.tone],T.tone!=="grey"||T.inSession));let S=1.6,GJ=5;zJ.add(this.cyl(S,GJ,n.steelDark,-5,0.6,-2.5,{},!0)),zJ.add(this.box(0.6,GJ-0.6,0.35,n.gunmetal,-5+S*0.7,0.9,-2.5+S*0.7));let yJ=new TJ(new w0(0.34,0.01,0.18),v6(T.fire?n.amber:n.waterGlow,1.6));yJ.position.set(-5+S*0.7,0.9,-2.5+S*0.7+0.18),yJ.userData.dyn=!0,zJ.add(yJ),this.fills.push({water:yJ,target:T.fire?0.95:T.inSession?0.3:0.1,maxH:GJ-1,base:0.9});let AJ=this.pipe([[OJ,2,m],[OJ,2,LJ-4.6]],0.8);this.valveOnPipe(OJ,2,m+5,0.8);let YJ=this.pipe([[OJ,2,LJ+4.6],[OJ,2,d]],0.8),sJ=T.inSession?T.star?6:T.fire?2:4:1;for(let C=0;C<sJ;C++)this.addFlow(AJ,C/sJ,T.inSession?0.4:0.08,0.8),this.addFlow(YJ,C/sJ,T.star?0.5:T.fire?0.06:0.25,0.8);if(T.fire){this.addSteam(new A(OJ-5,6.2,LJ-2.5)),this.addBeacon(new A(OJ+5,5.6,LJ-2.4),n.red);for(let C=0;C<6;C++)this.addFlow(AJ,C/6,0.03,0.8)}if(T.star)this.addHalo(new A(OJ,0.62,LJ),8);this.tag(zJ,{kind:"bay",id:T.repId}),Q.add(zJ);let DJ=this.makeVan(T.fire?n.red:T.star?n.green:n.van,T.inSession,T.name),wJ=new A(OJ+11,0.6,LJ+4);if(T.inSession){let C=new A(OJ+11,0.6,LJ+12),R=this.box(7,0.4,3.5,n.trench,C.x,-0.35,C.z);Q.add(R);let h=new TJ(new K6(2,16,10,0,Math.PI*2,0,Math.PI/2),N0(n.dirt,{roughness:1}));h.scale.set(1.5,0.6,1),h.position.set(C.x+5.5,0.6,C.z),h.castShadow=!0,Q.add(h);for(let c of[-4.4,4.4])Q.add(this.box(0.2,1,3.8,n.barrier,C.x+c,0.6,C.z)),Q.add(this.box(0.2,0.1,3.8,16777215,C.x+c,1.25,C.z));let s=new Z0;s.position.set(C.x-4,2.2,C.z-3.5),s.add(this.box(0.5,0.5,4.6,n.amber,0,0,2.3));let a=new Z0;a.position.set(0,0,4.6),a.add(this.box(0.5,0.5,2.6,n.amber,0,-1.3,0)),a.add(this.box(1.3,0.9,1.1,n.gunmetal,0,-2.8,0)),s.add(a),Q.add(this.box(2.2,1.8,2.4,n.amber,C.x-4,0.6,C.z-5.5)),Q.add(this.box(2.6,0.7,3.2,n.tyre,C.x-4,0.6,C.z-5.5)),Q.add(s),s.userData.dyn=!0,s.traverse((c)=>{c.castShadow=!1}),this.digs.push({site:C,boom:s,bucket:a,clods:[],next:Math.random()}),DJ.position.copy(wJ),DJ.rotation.y=Math.PI/2}else DJ.position.copy(wJ),DJ.rotation.y=Math.PI;Q.add(DJ),this.vans.set(T.repId,{group:DJ,home:wJ.clone(),rot:DJ.rotation.y,busy:!1}),this.labelAnchors.push({key:`bay:${T.repId}`,pos:new A(OJ,8.6,LJ),short:T.name,title:`${T.name} · advisor station`,tone:T.tone,kind:"bay",kpis:[["Status",T.inSession?"On the tools":"Off"],["Today",`${T.callsToday} calls · ${T.bookingsToday} booked`],["This week",`${T.bookings7d} booked in ${T.hours7d} h`],["Rate",T.rate7d===null?"—":`1 every ${(1/Math.max(0.01,T.rate7d)).toFixed(1)} h`],["Pressure",T.fire?"Backing up":T.star?"Clean, high":"Normal"]]})});let g={x:q.x+q.w+16,z:-44,w:96,d:88};this.plinth(g.x,g.z,g.w,g.d,"CLINIC DISTRICT",16),this.clinicRoadX=g.x+g.w+12;let e=g.x+6,u=this.pipe([[q.x+q.w-4,2,d],[e,2,d],[e,2,g.z+10],[e,2,g.z+g.d-10]],1.1);for(let T=0;T<Math.min(8,J.todayBooked+2);T++)this.addFlow(u,T/8,0.1,1.1);J.tanks.forEach((T,jJ)=>{let OJ=jJ%2,LJ=Math.floor(jJ/2),zJ=g.x+24+OJ*42,S=g.z+20+LJ*34,GJ=new Z0;GJ.position.set(zJ,0.6,S),GJ.add(this.box(18,9,12,n.wall,0,0,0,{map:X6(),roughness:0.85})),GJ.add(this.box(18.6,0.5,12.6,n.roof,0,9,0,{map:_8(),metalness:0.4})),GJ.add(this.box(16,3.2,0.4,n.glass,0,4.6,6.05,{transparent:!0,opacity:0.65,roughness:0.08,metalness:0.3})),GJ.add(this.box(16,2.6,0.4,n.glass,0,0.8,6.05,{transparent:!0,opacity:0.65,roughness:0.08,metalness:0.3})),GJ.add(this.box(3.2,3.2,0.5,n.door,0,0,6.1)),GJ.add(this.box(18,0.5,2.5,n.wallDark,0,3.6,7)),GJ.add(this.box(3,1.4,3,n.steelDark,-5,9.5,-2)),GJ.add(this.box(3,1.4,3,n.steelDark,5,9.5,-2));let yJ=U6(T.name.toUpperCase(),{w:12,h:1.4,font:0.7,color:"#eef2f6",bg:"#22406a"});yJ.position.set(0,8,6.4),GJ.add(yJ),GJ.add(this.box(1.4,0.4,0.3,n.green,0,6.9,6.4)),GJ.add(this.box(0.4,1.4,0.3,n.green,0,6.4,6.4));let AJ=3.4,YJ=8;GJ.add(this.cyl(AJ+0.8,0.6,n.concreteDark,14.5,0,0,{map:X6()})),GJ.add(this.cyl(AJ,YJ,n.steel,14.5,0.6,0,{},!0));for(let R of[0.33,0.66])GJ.add(this.ring(AJ+0.06,0.12,n.steelDark,14.5,0.6+YJ*R,0));GJ.add(this.cyl(AJ+0.12,0.5,n.steelDark,14.5,0.6+YJ,0)),GJ.add(this.box(0.9,YJ-0.6,0.5,n.gunmetal,14.5-AJ*0.72,0.9,AJ*0.72));let sJ=new TJ(new w0(0.42,0.01,0.22),v6(T.fill>=1?n.amber:n.waterGlow,1.8));sJ.position.set(14.5-AJ*0.72,1.1,AJ*0.72+0.24),sJ.userData.dyn=!0,GJ.add(sJ);let DJ={water:sJ,target:Math.max(0.02,T.fill),maxH:YJ-1.1,base:1.1};this.fills.push(DJ),this.tankFills.set(T.clinicId,DJ);let wJ=new Z0;wJ.position.set(14.5,0.6+YJ+2.6,0),wJ.rotation.y=Math.PI/4,wJ.userData.dyn=!0,GJ.add(wJ),this.tankPanels.set(T.clinicId,wJ),this.paintTankPanel(T.clinicId,T.delivered,T.packSize),GJ.add(this.valve(9.2,2,-3.5,T.fill>=1)),GJ.add(this.light(14.5,0.6+YJ+1.2,0,T.fill>=1?n.amber:z8[T.tone],T.fill>=1||T.tone!=="grey"));let C=this.pipe([[e,2,S-3.5],[zJ+9.2,2,S-3.5],[zJ+14.5,2,S-3.5],[zJ+14.5,2,S-AJ]],0.7);if(T.fill<1)for(let R=0;R<2;R++)this.addFlow(C,R/2,0.15,0.7);if(this.tag(GJ,{kind:"tank",id:T.clinicId}),Q.add(GJ),this.tankPos.set(T.clinicId,new A(zJ+14.5,0.6,S+6)),T.fire)this.addBeacon(new A(zJ,10.2,S),n.amber);this.labelAnchors.push({key:`tank:${T.clinicId}`,pos:new A(zJ,12.2,S),short:T.name,title:T.name,tone:T.tone,kind:"tank",kpis:[["Pack",String(T.packSize)],["Delivered",String(T.delivered)],["Remaining",String(T.owed)],["Tank",`${T.pct}%`],["Valve",T.fill>=1?"Closed · full":"Open"],...T.refundFails?[["Refunds failed",`${T.refundFails} · ${T.refundNames.join(", ")}`]]:[]]})});let WJ={x:q.x,z:q.z+q.d+22,w:q.w+30,d:42};this.plinth(WJ.x,WJ.z,WJ.w,WJ.d,"METER STATION",13);let HJ=WJ.x+22,vJ=WJ.z+WJ.d/2+2,fJ=new Z0;fJ.position.set(HJ,0.6,vJ),fJ.add(this.box(22,7,14,n.wall,0,0,0,{map:X6(),roughness:0.85})),fJ.add(this.box(22.6,0.6,14.6,n.roof,0,7,0,{map:_8(),metalness:0.4}));for(let T=0;T<3;T++)fJ.add(this.cyl(1.2,3.5,n.steelDark,-7+T*7,7.3,-3,{},!0));let o=new TJ(new z0(3,3,0.6,40),p0(2830648));o.rotation.x=Math.PI/2,o.position.set(-5,4,7.3),fJ.add(o);let JJ=this.box(0.25,2.4,0.2,n.red,-5,4,7.65);JJ.rotation.z=J.profit>=0?-0.9:0.9,fJ.add(JJ);let PJ=U6(`${J.rangeLabel.toUpperCase()}   IN $${Math.round(J.totalRevenue).toLocaleString()}   OUT $${Math.round(J.totalCost).toLocaleString()}`,{w:12,h:1.4,font:0.6,mono:!0,color:J.profit>=0?"#8ff0c8":"#ffc48a"});PJ.position.set(4.5,4.4,7.05),fJ.add(PJ);let SJ=U6("METER STATION · FINANCE",{w:12,h:1.2,font:0.7,color:"#eef2f6",bg:"#22406a"});SJ.position.set(4.5,6.2,7.05),fJ.add(SJ),this.tag(fJ,{kind:"meter",id:"meter"}),Q.add(fJ);let UJ=this.pipe([[e,2,g.z+g.d-10],[e,2,WJ.z-6],[HJ+11,2,WJ.z-6],[HJ+11,2,vJ-7]],1.1);for(let T=0;T<Math.max(1,Math.min(8,Math.round(J.totalRevenue/800)));T++)this.addFlow(UJ,T/8,0.12,1.1);this.labelAnchors.push({key:"meter",pos:new A(HJ,12,vJ),short:"Meter station",title:`Meter station · ${J.rangeLabel}`,tone:J.profit>=0?"green":"amber",kind:"meter",kpis:[["Revenue",Z(J.totalRevenue)],["Cost",Z(J.totalCost)],["Net",`${J.profit<0?"−":"+"}${Z(Math.abs(J.profit))}`]]}),J.puddles.forEach((T,jJ)=>{let OJ=HJ+22+jJ*16,LJ=vJ+4,zJ=new Z0;zJ.position.set(OJ,0.6,LJ),zJ.add(this.box(4,4.2,2.4,3817285,0,0,0,{metalness:0.5,roughness:0.45})),zJ.add(this.gauge(0,3,1.25,T.star?"green":T.tone==="red"?"amber":"grey")),zJ.add(this.light(0,4.9,0,T.star?n.green:T.tone==="red"?n.amber:n.grey,T.tone!=="grey")),this.pipe([[HJ+11,2,vJ-4],[OJ,2,vJ-4],[OJ,2,LJ-1.2]],0.5);let S=U6(T.city.toUpperCase(),{w:4,h:0.9,font:0.5,color:"#eef2f6",bg:"#22406a"});if(S.position.set(0,1,1.22),zJ.add(S),this.tag(zJ,{kind:"puddle",id:T.city}),Q.add(zJ),T.tone==="red")this.addLeak(new A(OJ+1.8,1.4,LJ+0.8),new A(0.6,-1,0.8));if(T.star)this.addHalo(new A(OJ,0.62,LJ),4);this.labelAnchors.push({key:`puddle:${T.city}`,pos:new A(OJ,7,LJ),short:T.city,title:`${T.city} · ${J.rangeLabel}`,tone:T.tone,kind:"puddle",kpis:[["Revenue",Z(T.revenue)],["Cost",Z(T.cost)],["Net",`${T.profit<0?"−":"+"}${Z(Math.abs(T.profit))}`],["Status",T.star?"Profitable":T.tone==="red"?"Leaking":"No shows yet"]]})}),y9(this.scenery,q.x-10,this.roadZ,this.clinicRoadX,this.roadZ,9),y9(this.scenery,this.clinicRoadX,this.roadZ,this.clinicRoadX,g.z-8,9);for(let[,T]of this.tankPos)y9(this.scenery,T.x+4,T.z+2,this.clinicRoadX,T.z+2,5);for(let[T,jJ]of[[q.x-8,this.roadZ-7],[q.x+q.w/2,this.roadZ-7],[this.clinicRoadX-7,this.roadZ-7],[this.clinicRoadX-7,g.z+24],[this.clinicRoadX-7,g.z+64]])this.lightPole(T,jJ);for(let[T,jJ]of[[X.x-8,X.z+12],[X.x-8,X.z+60],[g.x+g.w+20,g.z+4],[WJ.x+WJ.w+8,WJ.z+8],[X.x+20,X.z+X.d+10],[WJ.x-10,WJ.z+30]])this.tree(T,jJ);if(this.shippingContainer(q.x+q.w-20,q.z+4,n.navy),this.shippingContainer(q.x+q.w-20,q.z+8,9067066),this.shippingContainer(g.x+g.w-16,g.z+4,n.steelDark),this.fitPts.push(new A(this.clinicRoadX+5,0,g.z-8),new A(this.clinicRoadX+5,0,this.roadZ+5),new A(q.x-10,0,this.roadZ+5)),this.bake(),this.fitCamera(),this.focusTarget)this.focus(this.focusTarget);this.settle=90}deliverBooking(J,$){let Q=J&&this.vans.get(J)||[...this.vans.values()].find((X)=>!X.busy)||null;if(!Q||Q.busy)return;let Z=$&&this.tankPos.has($)?$:[...this.tankPos.keys()][0],W=Z?this.tankPos.get(Z):null;if(!W||!Z)return;let Y=Q.group.position.clone(),K=[Y,new A(Y.x,0.6,this.roadZ),new A(this.clinicRoadX,0.6,this.roadZ),new A(this.clinicRoadX,0.6,W.z+2),new A(W.x+4,0.6,W.z+2)];Q.busy=!0,this.trips.push({van:Q,curve:new W7(K,!1,"catmullrom",0.05),t:0,speed:0.2,phase:"out",clinicId:Z,crate:null,dropT:0,puffT:0})}setTankFill(J,$,Q){let Z=this.tankFills.get(J);if(Z)Z.target=Math.max(0.02,Q>0?Math.min(1,$/Q):0);this.paintTankPanel(J,$,Q)}focus(J){this.focusTarget=J,this.labelsDirty=!0,this.pointerDirty=!0;let $=J?J.kind==="depot"||J.kind==="meter"?J.kind:`${J.kind}:${J.id}`:null,Q=$?this.labelAnchors.find((W)=>W.key===$):null,Z=Q?new A(Q.pos.x,0,Q.pos.z):this.center.clone();this.camera.position.copy(Z).add(X7),this.camera.lookAt(Z),this.zoomTarget=J?0.6:1}dispose(){this.disposed=!0,cancelAnimationFrame(this.raf),window.removeEventListener("resize",this.refit),this.ro?.disconnect(),this.renderer.domElement.removeEventListener("pointermove",this.onMove),this.renderer.domElement.removeEventListener("click",this.onClick),this.clearTown(),this.renderer.dispose(),this.renderer.domElement.parentNode?.removeChild(this.renderer.domElement)}setNight(J){this.sun.intensity=J?0.8:2.4,this.sun.color.set(J?10466528:16773597),this.scene.background=new cJ(J?2765892:n.sky),this.scene.fog.color.set(J?2765892:n.sky),this.renderer.toneMappingExposure=J?0.9:1.1}buildGround(){let J=new TJ(new Y6(3000,3000),N0(n.grass,{roughness:1,map:NK()}));J.rotation.x=-Math.PI/2,J.receiveShadow=!0,this.scene.add(J)}plinth(J,$,Q,Z,W,Y){for(let H of[J,J+Q])for(let G of[$,$+Z])this.fitPts.push(new A(H,0,G),new A(H,Y,G));let K=this.box(Q,0.6,Z,n.concrete,J+Q/2,0,$+Z/2,{map:X6(),roughness:0.9});this.scenery.add(K);let X=new TJ(new w0(Q+1.4,0.4,Z+1.4),N0(n.kerb,{roughness:0.85}));X.position.set(J+Q/2,0.2,$+Z/2),X.receiveShadow=!0,this.scenery.add(X);let U=U6(W,{w:Math.min(Q-6,56),h:6.5,font:3.6,color:"#eef2f6",bg:"#4f5964",mono:!0});U.rotation.x=-Math.PI/2,U.rotation.z=Math.PI/4,U.position.set(J+Q/2,0.62,$+Z-9),this.scenery.add(U)}clearTown(){for(let J of[this.world,this.scenery,this.fx,this.proxies])J.traverse(($)=>{let Q=$;if(!Q.isMesh){let W=$.material;if($.isSprite&&W!==j9)W.dispose();return}Q.geometry.dispose();let Z=Q.material;if(!h9.has(Z)&&Z!==n$&&Z!==s$){if(Z.map&&![...f9.values()].includes(Z.map))Z.map.dispose();Z.dispose()}});this.world.clear(),this.scenery.clear(),this.fx.clear(),this.proxies.clear(),this.flowMeshes=[],this.fitPts=[],this.townSig="",this.labelsDirty=!0,this.pointerDirty=!0,this.pickables=[],this.flows=[],this.fills=[],this.tankFills.clear(),this.tankPanels.clear(),this.leaks=[],this.beacons=[],this.steams=[],this.spins=[],this.halos=[],this.digs=[],this.vans.clear(),this.trips=[],this.puffs=[],this.tankPos.clear(),this.labelAnchors=[],this.hovered=null}tag(J,$){let Q=new n0().setFromObject(J);if(Q.isEmpty())return;let Z=Q.getSize(new A),W=new TJ(new w0(Z.x,Z.y,Z.z),s$);Q.getCenter(W.position),W.visible=!1,W.userData=$,this.proxies.add(W),this.pickables.push(W)}bake(){for(let $ of[this.world,this.scenery]){$.updateMatrixWorld(!0);let Q=new Map,Z=[],W=(Y)=>{if(Y.userData.dyn)return;let K=Y;if(K.isMesh&&!Array.isArray(K.material)&&h9.has(K.material)&&K.children.length===0){let X=`${K.material.uuid}|${+K.castShadow}|${+K.receiveShadow}`,U=Q.get(X);if(!U)U={mat:K.material,cast:K.castShadow,recv:K.receiveShadow,geos:[]},Q.set(X,U);U.geos.push(K.geometry.applyMatrix4(K.matrixWorld)),Z.push(K);return}for(let X of Y.children)W(X)};W($);for(let Y of Z)Y.removeFromParent();for(let Y of Q.values()){let X=Y.geos.some((G)=>!G.index)?Y.geos.map((G)=>G.index?G.toNonIndexed():G):Y.geos,U=u$(X,!1);for(let G of new Set([...Y.geos,...X]))G.dispose();if(!U)continue;let H=new TJ(U,Y.mat);H.castShadow=Y.cast,H.receiveShadow=Y.recv,$.add(H)}}let J=new Map;for(let $ of this.flows){let Q=J.get($.r)??[];Q.push($),J.set($.r,Q)}for(let[$,Q]of J){let Z=new B9(new g0($+0.12,0.16,8,28),n$,Q.length);Z.frustumCulled=!1,Q.forEach((W,Y)=>{W.im=Z,W.idx=Y}),this.fx.add(Z),this.flowMeshes.push(Z)}this.shadowHold=2}box(J,$,Q,Z,W,Y,K,X={}){let U=new TJ(new w0(J,$,Q),N0(Z,X));return U.position.set(W,Y+$/2,K),U.castShadow=!0,U.receiveShadow=!0,U}cyl(J,$,Q,Z,W,Y,K={},X=!1){let U=new TJ(new z0(J,J,$,40),X?U7(Q):N0(Q,K));return U.position.set(Z,W+$/2,Y),U.castShadow=!0,U.receiveShadow=!0,U}ring(J,$,Q,Z,W,Y,K=!1){let X=new TJ(new g0(J,$,10,48),N0(Q,{roughness:0.45,metalness:0.7}));if(!K)X.rotation.x=Math.PI/2;else X.rotation.y=Math.PI/2;return X.position.set(Z,W,Y),X.castShadow=!0,X}disc(J,$,Q,Z,W,Y={}){let K=new TJ(new R8(J,48),N0($,Y));return K.rotation.x=-Math.PI/2,K.position.set(Q,W,Z),K.receiveShadow=!0,K}pipe(J,$,Q=!0){let Z=new W7(J.map((Y)=>new A(...Y)),!1,"catmullrom",0),W=new TJ(new M8(Z,Math.max(8,J.length*24),$,14,!1),p0(n.pipe));W.castShadow=!0,W.receiveShadow=!0,this.world.add(W);for(let Y of J){let K=new TJ(new z0($+0.32,$+0.32,0.55,20),N0(n.flange,{metalness:0.7,roughness:0.4}));K.position.set(Y[0],Y[1],Y[2]);let X=J[Math.min(J.length-1,J.indexOf(Y)+1)],U=X[0]-Y[0],H=X[2]-Y[2];K.rotation.z=Math.abs(U)>=Math.abs(H)?Math.PI/2:0,K.rotation.x=Math.abs(U)>=Math.abs(H)?0:Math.PI/2,K.castShadow=!0,this.world.add(K)}if(Q){let Y=Z.getLength(),K=Math.max(1,Math.floor(Y/12));for(let X=1;X<=K;X++){let U=Z.getPoint(X/(K+1));this.world.add(this.box(1.4,U.y-$,1.4,n.concreteDark,U.x,0.6,U.z,{map:X6()}))}}return Z}valveOnPipe(J,$,Q,Z){let W=new Z0;W.position.set(J,$,Q),W.add(this.cyl(Z+0.5,1.6,n.pipeDark,0,-0.8,0,{metalness:0.6,roughness:0.4}).rotateZ(Math.PI/2)),W.add(this.cyl(0.32,1.6,n.steelDark,0,Z-0.2,0,{},!0));let Y=new TJ(new g0(0.9,0.12,8,24),p0(n.red));Y.rotation.x=Math.PI/2,Y.position.y=Z+1.5,W.add(Y),this.world.add(W)}valve(J,$,Q,Z){let W=new Z0;W.position.set(J,$,Q),W.add(this.cyl(0.9,1.6,n.pipeDark,0,-0.8,0,{metalness:0.6,roughness:0.4}).rotateZ(Math.PI/2)),W.add(this.cyl(0.28,1.4,n.steelDark,0,0.5,0,{},!0));let Y=new TJ(new g0(0.8,0.11,8,24),p0(Z?n.red:n.steel));if(Y.rotation.x=Z?0:Math.PI/2,Y.position.y=1.9,W.add(Y),Z){let K=U6("CLOSED",{w:2.2,h:0.7,font:0.4,color:"#ffd6d0",bg:"#7a2a22"});K.position.set(0,3.1,0),K.rotation.y=Math.PI/4,W.add(K)}return W}gauge(J,$,Q,Z){let W=new Z0;W.position.set(J,$,Q);let Y=new TJ(new z0(0.75,0.75,0.25,24),N0(15264750,{roughness:0.3}));Y.rotation.x=Math.PI/2,W.add(Y),W.add(this.ring(0.78,0.08,n.steelDark,0,0,0,!1).rotateX(0));let K=new TJ(new g0(0.55,0.07,6,20,Math.PI*0.6),v6(Z==="grey"?n.grey:z8[Z],1.2));K.position.z=0.14,K.rotation.z=Z==="red"?-0.4:Z==="amber"?0.4:1.6,W.add(K);let X=this.box(0.08,0.6,0.06,2106408,0,0,0.16);return X.rotation.z=Z==="red"?-1.2:Z==="amber"?-0.3:Z==="green"?0.8:1.4,W.add(X),W}light(J,$,Q,Z,W){let Y=new Z0;Y.position.set(J,$,Q),Y.add(this.cyl(0.32,0.4,n.gunmetal,0,0,0));let K=new TJ(new K6(0.34,14,10),W?v6(Z,2.4):N0(Z,{roughness:0.3}));if(K.position.y=0.55,Y.add(K),W){let X=S7(v9(),Z,0.55,!0);X.scale.set(2.4,2.4,1),X.position.y=0.55,Y.add(X)}return Y}makeVan(J,$,Q){let Z=new Z0;Z.userData.dyn=!0,Z.add(this.box(3.4,2.7,6.4,J,0,0.55,-0.6,{roughness:0.3,metalness:0.35})),Z.add(this.box(3.4,2.1,2.4,J,0,0.55,3.8,{roughness:0.3,metalness:0.35})),Z.add(this.box(3.2,1,0.2,2042422,0,1.75,5.05,{roughness:0.05,metalness:0.6})),Z.add(this.box(0.2,0.8,5.6,2042422,1.71,1.9,-0.6,{roughness:0.05,metalness:0.6})),Z.add(this.box(3.42,0.35,6.42,n.vanTrim,0,1.55,-0.6));for(let Y of[1,-1]){let K=U6(Q.toUpperCase(),{w:3.2,h:0.9,font:0.5,color:"#eef2f6",bg:"#22406a"});K.position.set(Y*1.72,1.2,-0.6),K.rotation.y=Y*Math.PI/2,Z.add(K)}Z.add(this.box(3,0.15,5,n.steelDark,0,3.25,-0.4));for(let Y=0;Y<4;Y++)Z.add(this.box(3,0.1,0.15,n.steel,0,3.4,-2.6+Y*1.5));let W=v6(16773583,$?2.5:0.1);for(let Y of[1,-1]){let K=new TJ(new w0(0.7,0.35,0.15),W);K.position.set(Y*1.1,1.3,5.05),Z.add(K)}for(let[Y,K]of[[-1.7,2.3],[1.7,2.3],[-1.7,-2.3],[1.7,-2.3]]){let X=new TJ(new z0(0.7,0.7,0.5,20),N0(n.tyre,{roughness:0.9}));X.rotation.z=Math.PI/2,X.position.set(Y,0.7,K),X.castShadow=!0,Z.add(X);let U=new TJ(new z0(0.35,0.35,0.52,12),U7());U.rotation.z=Math.PI/2,U.position.set(Y,0.7,K),Z.add(U)}return Z}lightPole(J,$){this.scenery.add(this.cyl(0.2,10,n.gunmetal,J,0,$)),this.scenery.add(this.box(2.4,0.2,0.3,n.gunmetal,J+1.1,9.8,$));let Q=new TJ(new w0(1.4,0.25,0.5),v6(16771524,1.4));Q.position.set(J+2.2,9.7,$),this.scenery.add(Q)}tree(J,$){let Q=new Z0;Q.position.set(J,0,$),Q.add(this.cyl(0.35,2,7032631,0,0,0));let Z=new TJ(new K6(2.6,14,12),N0(5208645,{roughness:1}));Z.position.y=4,Z.castShadow=!0,Q.add(Z);let W=new TJ(new K6(1.9,14,12),N0(4483900,{roughness:1}));W.position.set(1.3,5.2,0.7),W.castShadow=!0,Q.add(W),this.scenery.add(Q)}shippingContainer(J,$,Q){this.scenery.add(this.box(12,2.6,2.6,Q,J,0.6,$,{roughness:0.55,metalness:0.4,map:_8()}))}paintTankPanel(J,$,Q){let Z=this.tankPanels.get(J);if(!Z)return;Z.clear();let W=Q>0?Math.round(Math.min(1,$/Q)*100):0;Z.add(U6(`${$} / ${Q}
${W}% FULL`,{w:6,h:3,font:1,mono:!0,color:W>=100?"#ffc48a":"#8fdcff"})),Z.add(this.box(6.4,3.4,0.3,n.gunmetal,0,-1.7,-0.2)),Z.add(this.box(0.3,3,0.3,n.gunmetal,0,-4.7,-0.2))}addFlow(J,$,Q,Z){this.flows.push({curve:J,t:$,speed:Q,r:Z,im:null,idx:0})}addLeak(J,$){let Q=this.disc(0.5,n.water,J.x+$.x*2,J.z+$.z*2,0.64,{transparent:!0,opacity:0.55,roughness:0.05,metalness:0.5});this.fx.add(Q),this.leaks.push({at:J,dir:$.clone().normalize(),drops:[],next:0,puddle:Q})}addBeacon(J,$){let Q=new Z0;Q.position.copy(J),Q.add(this.cyl(0.4,0.5,n.gunmetal,0,0,0));let Z=new TJ(new K6(0.45,14,10),zK($,2.5));Z.position.y=0.7,Q.add(Z);let W=S7(v9(),$,0.8,!0);W.scale.set(5,5,1),W.position.y=0.7,Q.add(W),this.fx.add(Q),this.beacons.push({dome:Z,glow:W,phase:Math.random()*6,color:$})}addSteam(J){this.steams.push({at:J,puffs:[],next:0})}addHalo(J,$){let Q=new TJ(new O8($-0.3,$,64),new W6({color:n.green,transparent:!0,opacity:0.55,side:s5,toneMapped:!1}));Q.rotation.x=-Math.PI/2,Q.position.copy(J),this.fx.add(Q),this.halos.push({ring:Q,phase:Math.random()*6})}fitCamera(){if(!this.fitPts.length){this.resize();return}this.camera.position.copy(X7),this.camera.lookAt(0,0,0),this.camera.updateMatrixWorld();let J=this.camera.matrixWorldInverse,$=new A,Q=1/0,Z=-1/0,W=1/0,Y=-1/0;for(let k of this.fitPts)$.copy(k).applyMatrix4(J),Q=Math.min(Q,$.x),Z=Math.max(Z,$.x),W=Math.min(W,$.y),Y=Math.max(Y,$.y);let K=this.container.clientWidth||1440,X=this.container.clientHeight||900,U=K>1000?Math.max(260,Math.round(K*0.21))+24:0,H=K>1000?0:Math.round(X*0.34)+8,G=44,V=K>1000?24:10,q=34,D=Math.max(200,K-U-V*2),O=Math.max(160,X-G-q-V-H);this.baseFs=Math.max((Z-Q)*X/(2*D),(Y-W)*X/(2*O));let M=2*this.baseFs/X,F=(Q+Z)/2+U/2*M,E=(W+Y)/2+(G+q-V-H)/2*M,z=this.camera.matrixWorld.elements,N=new A(z[0],z[1],z[2]).multiplyScalar(F).add(new A(z[4],z[5],z[6]).multiplyScalar(E));N.addScaledVector(X7,-N.y/X7.y),this.center=N,this.camera.position.copy(N).add(X7),this.camera.lookAt(N),this.resize()}resize=()=>{let J=this.container.clientWidth||1,$=this.container.clientHeight||1;this.renderer.setSize(J,$,!1);let Q=this.baseFs*this.zoom,Z=J/$;this.camera.left=-Q*Z,this.camera.right=Q*Z,this.camera.top=Q,this.camera.bottom=-Q,this.camera.updateProjectionMatrix(),this.labelsDirty=!0,this.pointerDirty=!0};refit=()=>{if(this.disposed)return;if(this.fitCamera(),this.focusTarget)this.focus(this.focusTarget)};onMove=(J)=>{let $=this.renderer.domElement.getBoundingClientRect();this.pointer.set((J.clientX-$.left)/$.width*2-1,-((J.clientY-$.top)/$.height)*2+1),this.pointerDirty=!0};onClick=()=>{let J=this.pickAt();this.opts.onPick?.(J?J.userData:null)};pickAt(){this.raycaster.setFromCamera(this.pointer,this.camera);let J=this.raycaster.intersectObjects(this.pickables,!0);if(!J.length)return null;let $=J[0].object;while($&&!($.userData&&$.userData.kind))$=$.parent;return $}loop=()=>{if(this.disposed)return;this.raf=requestAnimationFrame(this.loop);let J=this.clock.getDelta(),$=Math.min(0.05,J),Q=this.clock.elapsedTime;if(this.tuneResolution(J),Math.abs(this.zoom-this.zoomTarget)>0.002)this.zoom+=(this.zoomTarget-this.zoom)*(1-Math.exp(-$*5)),this.resize();let Z=this.dummy;for(let W of this.flows){if(!W.im)continue;W.t=(W.t+W.speed*$)%1,W.curve.getPoint(W.t,Z.position),Z.lookAt(W.curve.getPoint(Math.min(1,W.t+0.01))),Z.updateMatrix(),W.im.setMatrixAt(W.idx,Z.matrix)}for(let W of this.flowMeshes)W.instanceMatrix.needsUpdate=!0;for(let W of this.fills){let Y=W.water.scale.y*0.01,K=Y+(W.target*W.maxH-Y)*Math.min(1,$*1.6);W.water.scale.y=Math.max(0.01,K)/0.01,W.water.position.y=W.base+K/2}for(let W of this.spins)W.mesh.rotation.z+=$*W.speed;for(let W of this.beacons){let Y=(Math.sin(Q*6+W.phase)+1)/2;W.glow.material.opacity=0.15+0.75*Y,W.glow.scale.setScalar(3.5+3*Y),W.dome.material.emissiveIntensity=0.6+2.4*Y}for(let W of this.halos)W.ring.material.opacity=0.35+0.3*Math.sin(Q*1.6+W.phase),W.ring.rotation.z=Q*0.25;for(let W of this.leaks){if(W.next-=$,W.next<=0){W.next=0.07,j9.map??=LK();let K=new F8(j9);K.scale.set(0.5,0.5,1),K.position.copy(W.at),this.fx.add(K),W.drops.push({s:K,v:W.dir.clone().multiplyScalar(6).add(new A((Math.random()-0.5)*2,Math.random()*2,(Math.random()-0.5)*2)),life:1})}for(let K of[...W.drops])if(K.life-=$*1.4,K.v.y-=16*$,K.s.position.addScaledVector(K.v,$),K.s.position.y<0.7||K.life<=0)this.fx.remove(K.s),W.drops=W.drops.filter((X)=>X!==K);let Y=Math.min(3.2,W.puddle.scale.x+$*0.25);W.puddle.scale.set(Y,Y,1)}for(let W of this.steams){if(W.next-=$,W.next<=0){W.next=0.12;let Y=S7(d$(),16777215,0.6);Y.scale.set(1.2,1.2,1),Y.position.copy(W.at),this.fx.add(Y),W.puffs.push({s:Y,life:1})}for(let Y of[...W.puffs])if(Y.life-=$*0.7,Y.s.position.y+=$*4,Y.s.position.x+=$*0.6,Y.s.scale.addScalar($*2.5),Y.s.material.opacity=0.6*Math.max(0,Y.life),Y.life<=0)this.fx.remove(Y.s),W.puffs=W.puffs.filter((K)=>K!==Y)}for(let W of this.digs){if(W.boom.rotation.x=-0.35+Math.sin(Q*1.4)*0.3,W.bucket.rotation.x=0.6+Math.sin(Q*1.4+1)*0.5,W.next-=$,W.next<=0){W.next=0.6+Math.random()*0.5;let Y=new TJ(new N8(0.32),N0(n.dirt,{roughness:1}));Y.position.set(W.site.x-1,2,W.site.z),this.fx.add(Y),W.clods.push({mesh:Y,v:new A(4+Math.random()*2,4+Math.random()*2,(Math.random()-0.5)*2),life:1.2})}for(let Y of[...W.clods])if(Y.life-=$,Y.v.y-=14*$,Y.mesh.position.addScaledVector(Y.v,$),Y.life<=0||Y.mesh.position.y<0.6)this.fx.remove(Y.mesh),W.clods=W.clods.filter((K)=>K!==Y)}for(let W of[...this.trips])this.stepTrip(W,$);for(let W of[...this.puffs])if(W.life-=$*0.9,W.s.position.y+=$*1.2,W.s.scale.addScalar($*1.2),W.s.material.opacity=0.5*Math.max(0,W.life),W.life<=0)this.fx.remove(W.s),this.puffs=this.puffs.filter((Y)=>Y!==W);if(this.pointerDirty){this.pointerDirty=!1;let W=this.pickAt();if(W!==this.hovered)this.hovered=W,this.renderer.domElement.style.cursor=W?"pointer":"default",this.labelsDirty=!0}if(this.trips.length)this.shadowHold=2;if(this.shadowHold>0)this.shadowHold--,this.renderer.shadowMap.needsUpdate=!0;if(this.renderer.render(this.scene,this.camera),this.labelsDirty)this.labelsDirty=!1,this.emitLabels()};emitLabels(){if(!this.opts.onLabels)return;let J=this.container.clientWidth,$=this.container.clientHeight,Q=this.hovered?.userData,Z=Q?Q.kind==="depot"||Q.kind==="meter"?Q.kind:`${Q.kind}:${Q.id}`:null,W=new A,Y=this.labelAnchors.map((U)=>{return W.copy(U.pos).project(this.camera),{key:U.key,x:(W.x+1)/2*J,y:(1-W.y)/2*$,short:U.short,title:U.title,kpis:U.kpis,tone:U.tone,hidden:W.z>1,active:U.key===Z,kind:U.kind,compact:!1}}),K=[],X=(U)=>K.every((H)=>U[0]>H[2]||U[2]<H[0]||U[1]>H[3]||U[3]<H[1]);for(let U of[...Y].sort((H,G)=>o$[H.tone]-o$[G.tone])){if(U.hidden||U.active)continue;let H=(U.short.length*6.2+30)/2,G=[0,-22,22,-44].find((V)=>X([U.x-H,U.y+V-21,U.x+H,U.y+V]));if(G===void 0)U.compact=!0,K.push([U.x-7,U.y-14,U.x+7,U.y]);else U.y+=G,K.push([U.x-H,U.y-21,U.x+H,U.y])}this.opts.onLabels(Y)}tuneResolution(J){if(this.settle>0){this.settle--,this.slowT=0,this.slowN=0;return}if(J>0.25)return;if(this.slowT+=J,this.slowN++,this.slowN<90)return;let $=this.slowT/this.slowN;this.slowT=0,this.slowN=0;let Q=this.renderer.getPixelRatio();if($>0.025&&Q>1)this.renderer.setPixelRatio(Math.max(1,Q>1.5?1.5:Q>1.25?1.25:1)),this.resize(),this.settle=30}stepTrip(J,$){let Q=J.van.group;if(J.phase==="drop"){J.dropT+=$;let Y=this.tankPos.get(J.clinicId);if(J.crate&&Y){let K=Math.min(1,J.dropT/1.1);if(J.crate.position.lerpVectors(new A(Q.position.x,3,Q.position.z),new A(Y.x,9.6,Y.z-6),K),J.crate.position.y+=Math.sin(K*Math.PI)*7,J.crate.rotation.y+=$*5,K>=1){this.fx.remove(J.crate),J.crate=null;let X=S7(v9(),n.waterGlow,0.9,!0);X.scale.set(4,4,1),X.position.set(Y.x,9.4,Y.z-6),this.fx.add(X),this.puffs.push({s:X,life:1})}}if(J.dropT>2){J.phase="back";let K=J.van.home;J.curve=new W7([Q.position.clone(),new A(this.clinicRoadX,0.6,Q.position.z),new A(this.clinicRoadX,0.6,this.roadZ),new A(K.x,0.6,this.roadZ),K.clone()],!1,"catmullrom",0.05),J.t=0,J.speed=0.15}return}if(J.t+=$*J.speed,J.puffT-=$,J.puffT<=0){J.puffT=0.15;let Y=S7(d$(),14212578,0.5);Y.scale.set(1.4,1.4,1),Y.position.set(Q.position.x,1.4,Q.position.z),this.fx.add(Y),this.puffs.push({s:Y,life:1})}if(J.t>=1){if(J.phase==="out"){J.phase="drop",J.dropT=0;let Y=this.box(1.5,1.5,1.5,n.navy,Q.position.x,3,Q.position.z);this.fx.add(Y),J.crate=Y}else Q.position.copy(J.van.home),Q.rotation.y=J.van.rot,J.van.busy=!1,this.trips=this.trips.filter((Y)=>Y!==J);return}let Z=J.curve.getPoint(J.t),W=J.curve.getPoint(Math.min(1,J.t+0.01));Q.position.set(Z.x,0.6,Z.z),Q.rotation.y=Math.atan2(W.x-Z.x,W.z-Z.z)}}function y9(J,$,Q,Z,W,Y){let K=Z-$,X=W-Q,U=Math.hypot(K,X);if(U<1)return;let H=new TJ(new Y6(U,Y),N0(n.asphalt,{roughness:0.95,map:OK()}));H.rotation.x=-Math.PI/2,H.rotation.z=-Math.atan2(X,K),H.position.set(($+Z)/2,0.05,(Q+W)/2),H.receiveShadow=!0,J.add(H);let G=Math.floor(U/6);for(let V=0;V<G;V++){let q=(V+0.5)/G,D=new TJ(new Y6(2.4,0.25),new W6({color:14278114}));D.rotation.x=-Math.PI/2,D.rotation.z=-Math.atan2(X,K),D.position.set($+K*q,0.06,Q+X*q),J.add(D)}}window.__HTG_SCENE__={TownScene:b9};})();
